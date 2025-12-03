import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TripOffer } from '../types/assignment.types';
import { RedisService } from '../../common/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Gateway WebSocket para comunicación con la app móvil de conductores.
 *
 * Maneja:
 * - Conexiones/desconexiones de conductores
 * - Envío de ofertas de viaje
 * - Recepción de respuestas (aceptar/rechazar)
 */
@WebSocketGateway({
  cors: {
    origin: '*', // En producción, especificar dominios permitidos
  },
  namespace: '/drivers',
})
export class OfferGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OfferGateway.name);
  
  // Map de conductores conectados: driverId -> Socket
  private readonly connectedDrivers: Map<number, Socket> = new Map();
  
  // Map de relación: socket.id -> driverId (para identificar conductor desde socket)
  private readonly socketToDriver: Map<string, number> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {
    // Escuchar eventos de ofertas creadas para enviarlas automáticamente
    this.eventEmitter.on('offer.created', (offer: TripOffer) => {
      this.sendOfferToDriver(offer.driverId, offer);
    });
  }

  /**
   * Maneja la conexión de un conductor.
   */
  handleConnection(client: Socket) {
    this.logger.debug(`Cliente conectado: ${client.id}`);
    
    // El conductor debe enviar su ID al conectarse
    // Se maneja en el evento 'driver.connect'
  }

  /**
   * Maneja la desconexión de un conductor.
   */
  handleDisconnect(client: Socket) {
    // Obtener driverId del socket
    const driverId = this.socketToDriver.get(client.id);
    
    if (driverId) {
      // Limpiar ambas relaciones
      this.socketToDriver.delete(client.id);
      this.connectedDrivers.delete(driverId);
      this.logger.log(`Conductor #${driverId} desconectado`);
    } else {
      this.logger.debug(`Cliente desconectado sin identificar: ${client.id}`);
    }
  }

  /**
   * Evento: Conductor se identifica al conectarse.
   */
  @SubscribeMessage('driver.connect')
  async handleDriverConnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: number },
  ) {
    const { driverId } = data;

    if (!driverId) {
      client.emit('error', { message: 'driverId es requerido' });
      return;
    }

    // Guardar ambas relaciones
    this.socketToDriver.set(client.id, driverId);
    this.connectedDrivers.set(driverId, client);
    
    this.logger.log(`Conductor #${driverId} conectado (socket: ${client.id})`);
    
    // Inicializar ubicación desde BD si no hay en Redis
    await this.initializeDriverLocation(driverId);
    
    client.emit('driver.connected', {
      driverId,
      message: 'Conectado exitosamente',
    });
  }

  /**
   * Evento: Conductor envía su ubicación actual.
   * Se guarda en Redis para uso en tiempo real.
   */
  @SubscribeMessage('driver.location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number },
  ) {
    // Obtener driverId del socket
    const driverId = this.socketToDriver.get(client.id);

    if (!driverId) {
      client.emit('error', {
        message: 'No identificado. Envía driver.connect primero',
      });
      return;
    }

    const { lat, lng } = data;

    if (lat === undefined || lng === undefined) {
      client.emit('error', { message: 'lat y lng son requeridos' });
      return;
    }

    try {
      // Construir key de Redis
      const key = `driver:${driverId}:location`;

      // Construir valor (JSON string)
      const value = JSON.stringify({
        lat,
        lng,
        timestamp: Date.now(),
      });

      // Guardar en Redis con TTL de 60 segundos
      await this.redisService.set(key, value, 60);

      this.logger.debug(
        `Ubicación actualizada para conductor #${driverId}: (${lat}, ${lng})`,
      );
    } catch (error) {
      this.logger.error(
        `Error al guardar ubicación del conductor #${driverId}:`,
        error,
      );
      client.emit('error', { message: 'Error al guardar ubicación' });
    }
  }

  /**
   * Evento: Conductor acepta una oferta de viaje.
   */
  @SubscribeMessage('trip.accept')
  handleOfferAccepted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offerId: string },
  ) {
    const { offerId } = data;

    if (!offerId) {
      client.emit('error', { message: 'offerId es requerido' });
      return;
    }

    this.logger.log(`Oferta ${offerId.slice(0, 8)} aceptada por conductor`);

    // Emitir evento para que el orquestador lo maneje
    this.eventEmitter.emit('driver.offer_accepted', offerId);

    // Confirmar al conductor
    client.emit('trip.accepted', {
      offerId,
      message: 'Oferta aceptada, procesando...',
    });
  }

  /**
   * Evento: Conductor rechaza una oferta de viaje.
   */
  @SubscribeMessage('trip.reject')
  handleOfferRejected(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offerId: string },
  ) {
    const { offerId } = data;

    if (!offerId) {
      client.emit('error', { message: 'offerId es requerido' });
      return;
    }

    this.logger.log(`Oferta ${offerId.slice(0, 8)} rechazada por conductor`);

    // Emitir evento para que el orquestador lo maneje
    this.eventEmitter.emit('driver.offer_rejected', offerId);

    // Confirmar al conductor
    client.emit('trip.rejected', {
      offerId,
      message: 'Oferta rechazada',
    });
  }

  /**
   * Envía una oferta a un conductor específico.
   *
   * @param driverId - ID del conductor
   * @param offer - Oferta a enviar
   */
  sendOfferToDriver(driverId: number, offer: TripOffer): void {
    const socket = this.connectedDrivers.get(driverId);

    if (!socket) {
      this.logger.warn(
        `No se puede enviar oferta ${offer.offerId.slice(0, 8)}: conductor #${driverId} no está conectado`,
      );
      return;
    }

    this.logger.log(
      `Enviando oferta ${offer.offerId.slice(0, 8)} a conductor #${driverId}`,
    );

    // Enviar la oferta por WebSocket
    socket.emit('trip.offer', {
      offerId: offer.offerId,
      restaurant: offer.restaurant,
      stops: offer.stops,
      summary: offer.summary,
      expiresAt: offer.expiresAt,
    });
  }

  /**
   * Verifica si un conductor está conectado.
   *
   * @param driverId - ID del conductor
   * @returns true si está conectado
   */
  isDriverConnected(driverId: number): boolean {
    return this.connectedDrivers.has(driverId);
  }

  /**
   * Obtiene el número de conductores conectados (para monitoreo).
   */
  getConnectedDriversCount(): number {
    return this.connectedDrivers.size;
  }

  /**
   * Inicializa la ubicación del conductor en Redis desde BD.
   * Esto asegura que siempre haya una ubicación disponible, incluso si
   * el conductor no ha enviado ubicación aún.
   *
   * @param driverId - ID del conductor
   */
  private async initializeDriverLocation(driverId: number): Promise<void> {
    try {
      // Verificar si ya hay ubicación en Redis
      const key = `driver:${driverId}:location`;
      const existing = await this.redisService.get(key);
      
      if (existing) {
        // Ya hay ubicación en Redis, no hacer nada
        this.logger.debug(
          `Conductor #${driverId} ya tiene ubicación en Redis`,
        );
        return;
      }

      // Obtener ubicación de BD como inicialización
      const conductor = await this.prisma.conductor.findUnique({
        where: { id: driverId },
        select: { latitudActual: true, longitudActual: true },
      });

      if (conductor?.latitudActual && conductor?.longitudActual) {
        // Guardar ubicación inicial en Redis
        const value = JSON.stringify({
          lat: Number(conductor.latitudActual),
          lng: Number(conductor.longitudActual),
          timestamp: Date.now(),
          source: 'database', // Indica que viene de BD, no de GPS
        });

        await this.redisService.set(key, value, 60);
        
        this.logger.debug(
          `Ubicación inicializada desde BD para conductor #${driverId}: (${conductor.latitudActual}, ${conductor.longitudActual})`,
        );
      } else {
        this.logger.warn(
          `Conductor #${driverId} no tiene coordenadas en BD para inicializar`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error al inicializar ubicación del conductor #${driverId}:`,
        error,
      );
      // No lanzar error, solo loguear (no es crítico)
    }
  }
}

