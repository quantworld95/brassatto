import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClusteringService } from '../clustering/clustering.service';
import { DriverSelectionService } from '../driver-selection/driver-selection.service';
import { RouteOptimizerService } from '../route-optimizer/route-optimizer.service';
import { OfferService } from '../offer/offer.service';
import { PersistenceService } from '../persistence/persistence.service';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../types/assignment.types';
import {
  ORCHESTRATOR_CONFIG,
  RESTAURANT_INFO,
} from '../config/orchestrator.config';

/**
 * Orquestador de Asignación de Pedidos.
 *
 * Coordina todas las fases del algoritmo:
 * - FASE A: Clustering
 * - FASE B: Selección de conductores
 * - FASE C: Optimización de rutas
 * - FASE D: Creación y envío de ofertas
 * - FASE E: Persistencia (cuando se acepta)
 *
 * Maneja el delay de 3 minutos y los eventos del sistema.
 */
@Injectable()
export class AssignmentOrchestrator {
  private readonly logger = new Logger(AssignmentOrchestrator.name);

  // Estado del procesamiento programado
  private processingScheduled: boolean = false;
  private scheduledTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly clusteringService: ClusteringService,
    private readonly driverSelectionService: DriverSelectionService,
    private readonly routeOptimizerService: RouteOptimizerService,
    private readonly offerService: OfferService,
    private readonly persistenceService: PersistenceService,
  ) {}

  /**
   * Evento: Un pedido cambió a READY_FOR_PICKUP.
   * Programa el procesamiento después del delay.
   */
  @OnEvent('order.ready_for_pickup')
  onOrderReady(orderId: number): void {
    this.logger.debug(`Pedido #${orderId} listo para recoger`);

    // Si ya hay un procesamiento programado, no hacer nada
    // (el nuevo pedido se incluirá automáticamente cuando se ejecute)
    if (this.processingScheduled) {
      this.logger.debug(
        `Ya hay procesamiento programado, pedido #${orderId} se incluirá en el próximo ciclo`,
      );
      return;
    }

    // Programar procesamiento después del delay
    this.scheduleProcessing();
  }

  /**
   * Programa la ejecución del algoritmo después del delay configurado.
   */
  private scheduleProcessing(): void {
    if (this.processingScheduled) {
      return;
    }

    this.processingScheduled = true;
    const delayMs = ORCHESTRATOR_CONFIG.processingDelaySeconds * 1000;

    this.logger.log(
      `Programando procesamiento de asignación en ${ORCHESTRATOR_CONFIG.processingDelaySeconds} segundos`,
    );

    this.scheduledTimeout = setTimeout(() => {
      this.runAlgorithm()
        .then(() => {
          this.processingScheduled = false;
          this.scheduledTimeout = null;
        })
        .catch((error) => {
          this.logger.error('Error en runAlgorithm:', error);
          this.processingScheduled = false;
          this.scheduledTimeout = null;
        });
    }, delayMs);
  }

  /**
   * Ejecuta el algoritmo completo de asignación.
   * Coordina las fases A, B, C y D.
   */
  private async runAlgorithm(): Promise<void> {
    this.logger.log('🚀 Iniciando proceso de asignación de pedidos...');

    try {
      // ============ FASE A: CLUSTERING ============
      this.logger.log('📦 FASE A: Clustering de pedidos...');
      const batches = await this.clusteringService.createBatches(
        DEFAULT_ASSIGNMENT_CONFIG,
      );

      if (batches.length === 0) {
        this.logger.log('No hay pedidos para procesar');
        return;
      }

      this.logger.log(`✅ ${batches.length} batches generados`);

      // ============ FASE B: SELECCIÓN DE CONDUCTORES ============
      this.logger.log('🚗 FASE B: Selección de conductores...');
      const assignments =
        await this.driverSelectionService.selectDriversForBatches(
          batches,
          RESTAURANT_INFO,
          DEFAULT_ASSIGNMENT_CONFIG,
        );

      if (assignments.length === 0) {
        this.logger.warn('No se pudieron asignar batches (no hay conductores disponibles)');
        return;
      }

      this.logger.log(`✅ ${assignments.length} asignaciones realizadas`);

      // ============ FASE C: OPTIMIZACIÓN DE RUTAS ============
      this.logger.log('🗺️  FASE C: Optimización de rutas...');
      
      for (const assignment of assignments) {
        try {
          assignment.optimizedRoute =
            await this.routeOptimizerService.optimizeRoute(
              assignment.batch,
              RESTAURANT_INFO,
            );
        } catch (error) {
          this.logger.error(
            `Error optimizando ruta para batch ${assignment.batch.tempId.slice(-8)}:`,
            error,
          );
          // Continuar con los demás aunque uno falle
        }
      }

      this.logger.log(`✅ Rutas optimizadas para ${assignments.length} batches`);

      // ============ FASE D: CREAR Y ENVIAR OFERTAS ============
      this.logger.log('💌 FASE D: Creación y envío de ofertas...');

      let offersCreated = 0;
      for (const assignment of assignments) {
        try {
          // Crear oferta
          const offer = this.offerService.createOffer(assignment);

          // Enviar al conductor
          await this.offerService.sendToDriver(offer);

          offersCreated++;
        } catch (error) {
          this.logger.error(
            `Error creando/enviando oferta para batch ${assignment.batch.tempId.slice(-8)}:`,
            error,
          );
        }
      }

      this.logger.log(
        `✅ Proceso completado: ${offersCreated} ofertas enviadas a conductores`,
      );
    } catch (error) {
      this.logger.error('Error en el algoritmo de asignación:', error);
      throw error;
    }
  }

  /**
   * Evento: Conductor aceptó una oferta.
   * Ejecuta FASE E: Persistencia en BD.
   */
  @OnEvent('driver.offer_accepted')
  async onOfferAccepted(offerId: string): Promise<void> {
    this.logger.log(`✅ Oferta ${offerId.slice(0, 8)} aceptada por conductor`);

    try {
      // Obtener la oferta
      const offer = this.offerService.getOffer(offerId);

      if (!offer) {
        // Verificar si la oferta expiró
        this.logger.warn(
          `Oferta ${offerId} no encontrada. Posiblemente expiró antes de ser aceptada.`,
        );
        return;
      }

      // Verificar si la oferta ya expiró
      if (offer.expiresAt < new Date()) {
        this.logger.warn(
          `Oferta ${offerId.slice(0, 8)} ya expiró (expiración: ${offer.expiresAt.toISOString()})`,
        );
        // Remover oferta expirada
        this.offerService.removeOffer(offerId);
        return;
      }

      // FASE E: Persistir en BD
      const persistedBatch = await this.persistenceService.persistAcceptedOffer(
        offer,
      );

      // Remover oferta del almacén
      this.offerService.removeOffer(offerId);

      this.logger.log(
        `✅ Batch #${persistedBatch.batchId} creado en BD con ${persistedBatch.stops.length} stops`,
      );
    } catch (error) {
      this.logger.error(`Error al procesar aceptación de oferta ${offerId}:`, error);
    }
  }

  /**
   * Evento: Conductor rechazó una oferta.
   */
  @OnEvent('driver.offer_rejected')
  async onOfferRejected(offerId: string): Promise<void> {
    this.logger.log(`❌ Oferta ${offerId.slice(0, 8)} rechazada por conductor`);

    // Remover oferta del almacén
    this.offerService.removeOffer(offerId);

    // Registrar rechazo (no persiste nada en BD)
    await this.persistenceService.handleRejection(offerId);

    // TODO: Implementar lógica de reasignación si es necesario
    // Por ahora, el pedido quedará disponible para el próximo ciclo
  }

  /**
   * Evento: Oferta expiró (tiempo límite alcanzado).
   */
  @OnEvent('driver.offer_expired')
  async onOfferExpired(offerId: string): Promise<void> {
    this.logger.log(`⏰ Oferta ${offerId.slice(0, 8)} expirada`);

    // La oferta ya fue removida en OfferService antes de emitir el evento
    // Solo registrar expiración
    await this.persistenceService.handleExpiration(offerId);

    // TODO: Reasignar a otro conductor o reintentar
  }

  /**
   * Método público para ejecutar el algoritmo manualmente (para testing).
   */
  async processManually(): Promise<void> {
    if (this.processingScheduled) {
      this.logger.warn('Ya hay un procesamiento programado');
      return;
    }

    await this.runAlgorithm();
  }
}

