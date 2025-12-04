import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  TentativeAssignment,
  TripOffer,
  TripOfferStop,
} from '../types/assignment.types';
import {
  ORCHESTRATOR_CONFIG,
  RESTAURANT_INFO,
} from '../config/orchestrator.config';

/**
 * Servicio de Ofertas - FASE D del algoritmo de asignación.
 *
 * Responsabilidades:
 * - Crear objetos TripOffer a partir de TentativeAssignment
 * - Almacenar ofertas activas en memoria
 * - Programar expiración automática
 * - Gestionar ciclo de vida de ofertas
 */
@Injectable()
export class OfferService implements OnModuleInit {
  private readonly logger = new Logger(OfferService.name);
  
  // Almacén temporal de ofertas activas (en memoria)
  private readonly activeOffers: Map<string, TripOffer> = new Map();
  
  // Timeouts de expiración
  private readonly expirationTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.logger.log('OfferService inicializado');
  }

  /**
   * Crea una oferta de viaje a partir de una asignación tentativa.
   *
   * @param assignment - Asignación con batch, conductor y ruta optimizada
   * @returns Oferta creada
   */
  createOffer(assignment: TentativeAssignment): TripOffer {
    const offerId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + ORCHESTRATOR_CONFIG.offerExpirationSeconds * 1000,
    );

    // Construir stops para la oferta (versión simplificada para el conductor)
    const stops: TripOfferStop[] = assignment.optimizedRoute.map((stop, index) => {
      // Calcular ETA acumulado hasta este stop
      const etaMinutes = assignment.optimizedRoute
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.etaFromPreviousMinutes, 0);

      return {
        sequence: stop.sequence,
        address: stop.address,
        approximateZone: this.extractZone(stop.address),
        etaMinutes: Math.round(etaMinutes),
      };
    });

    // Construir resumen
    const summary = {
      totalOrders: assignment.batch.orders.length,
      totalDistanceKm: assignment.totalDistanceKm,
      estimatedTimeMinutes: assignment.totalTimeMinutes,
      estimatedEarnings: assignment.estimatedEarnings,
    };

    const offer: TripOffer = {
      offerId,
      driverId: assignment.driver.id,
      createdAt: now,
      expiresAt,
      restaurant: {
        name: RESTAURANT_INFO.name,
        address: RESTAURANT_INFO.address,
        coordinates: RESTAURANT_INFO.coordinates,
      },
      stops,
      summary,
      _internal: {
        batchTempId: assignment.batch.tempId,
        orderIds: assignment.batch.orderIds,
        optimizedRoute: assignment.optimizedRoute,
      },
    };

    // Almacenar en memoria
    this.activeOffers.set(offerId, offer);

    this.logger.log(
      `Oferta ${offerId.slice(0, 8)} creada para conductor #${assignment.driver.id} (${assignment.batch.orders.length} pedidos)`,
    );

    return offer;
  }

  /**
   * Envía una oferta al conductor y programa su expiración.
   *
   * @param offer - Oferta a enviar
   */
  async sendToDriver(offer: TripOffer): Promise<void> {
    // Programar expiración automática
    this.scheduleExpiration(offer.offerId);

    // Emitir evento para que el Gateway la envíe por WebSocket
    this.eventEmitter.emit('offer.created', offer);

    this.logger.log(
      `Oferta ${offer.offerId.slice(0, 8)} enviada a conductor #${offer.driverId}`,
    );
  }

  /**
   * Obtiene una oferta por su ID.
   *
   * @param offerId - ID de la oferta
   * @returns Oferta o null si no existe
   */
  getOffer(offerId: string): TripOffer | null {
    return this.activeOffers.get(offerId) || null;
  }

  /**
   * Remueve una oferta del almacén (cuando se acepta, rechaza o expira).
   *
   * @param offerId - ID de la oferta a remover
   */
  removeOffer(offerId: string): void {
    const offer = this.activeOffers.get(offerId);
    if (!offer) {
      this.logger.warn(`Intento de remover oferta inexistente: ${offerId}`);
      return;
    }

    // Cancelar timeout de expiración si existe
    const timeout = this.expirationTimeouts.get(offerId);
    if (timeout) {
      clearTimeout(timeout);
      this.expirationTimeouts.delete(offerId);
    }

    // Remover del almacén
    this.activeOffers.delete(offerId);

    this.logger.debug(`Oferta ${offerId.slice(0, 8)} removida del almacén`);
  }

  /**
   * Programa la expiración automática de una oferta.
   *
   * @param offerId - ID de la oferta
   */
  private scheduleExpiration(offerId: string): void {
    const offer = this.activeOffers.get(offerId);
    if (!offer) {
      this.logger.warn(`No se puede programar expiración: oferta ${offerId} no existe`);
      return;
    }

    const expirationTime = offer.expiresAt.getTime() - Date.now();

    if (expirationTime <= 0) {
      // Ya expiró, emitir evento inmediatamente
      this.eventEmitter.emit('driver.offer_expired', offerId);
      return;
    }

    const timeout = setTimeout(() => {
      this.logger.log(`Oferta ${offerId.slice(0, 8)} expirada automáticamente`);
      // Remover antes de emitir el evento para evitar condición de carrera
      this.removeOffer(offerId);
      // Emitir evento después de remover
      this.eventEmitter.emit('driver.offer_expired', offerId);
    }, expirationTime);

    this.expirationTimeouts.set(offerId, timeout);
  }

  /**
   * Extrae una zona aproximada de una dirección.
   * Ejemplo: "Av. Monseñor Rivero #100" → "Zona Norte"
   *
   * @param address - Dirección completa
   * @returns Zona aproximada
   */
  private extractZone(address: string | null): string {
    if (!address) return 'Zona desconocida';

    // Lógica simple: buscar palabras clave
    const lowerAddress = address.toLowerCase();

    if (lowerAddress.includes('norte') || lowerAddress.includes('busch')) {
      return 'Zona Norte';
    }
    if (lowerAddress.includes('sur') || lowerAddress.includes('santos')) {
      return 'Zona Sur';
    }
    if (lowerAddress.includes('este')) {
      return 'Zona Este';
    }
    if (lowerAddress.includes('oeste')) {
      return 'Zona Oeste';
    }

    // Por defecto, usar parte de la dirección
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || 'Zona Central';
  }

  /**
   * Obtiene todas las ofertas activas (para debugging/monitoreo).
   *
   * @returns Array de ofertas activas
   */
  getAllActiveOffers(): TripOffer[] {
    return Array.from(this.activeOffers.values());
  }

  /**
   * Obtiene ofertas de un conductor específico.
   *
   * @param driverId - ID del conductor
   * @returns Array de ofertas
   */
  getOffersByDriver(driverId: number): TripOffer[] {
    return Array.from(this.activeOffers.values()).filter(
      (offer) => offer.driverId === driverId,
    );
  }
}

