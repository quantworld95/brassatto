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
  async handleDisconnect(client: Socket) {
    // Obtener driverId del socket
    const driverId = this.socketToDriver.get(client.id);
    
    if (driverId) {
      // Intentar obtener la última ubicación de Redis antes de desconectar
      let lastLocation = null;
      try {
        if (this.redisService.isConnected()) {
          const key = `driver:${driverId}:location`;
          const locationJson = await this.redisService.get(key);
          if (locationJson) {
            lastLocation = JSON.parse(locationJson);
            this.logger.debug(
              `Última ubicación obtenida de Redis para conductor #${driverId}: (${lastLocation.lat}, ${lastLocation.lng})`,
            );
          }
        }
      } catch (error) {
        this.logger.debug(`No se pudo obtener última ubicación de Redis para conductor #${driverId}:`, error);
      }
      
      // Limpiar ambas relaciones
      this.socketToDriver.delete(client.id);
      this.connectedDrivers.delete(driverId);
      
      // Actualizar estado y última ubicación en BD
      try {
        const updateData: any = { estado: 'DESCONECTADO' };
        
        // Si tenemos la última ubicación de Redis, guardarla en BD
        if (lastLocation) {
          updateData.latitudActual = lastLocation.lat;
          updateData.longitudActual = lastLocation.lng;
          this.logger.log(
            `Conductor #${driverId} desconectado - Estado: DESCONECTADO, Última ubicación guardada: (${lastLocation.lat}, ${lastLocation.lng})`,
          );
        } else {
          this.logger.log(`Conductor #${driverId} desconectado - Estado actualizado a DESCONECTADO`);
        }
        
        await this.prisma.conductor.update({
          where: { id: driverId },
          data: updateData,
        });
      } catch (error) {
        this.logger.error(`Error al actualizar estado del conductor #${driverId} a DESCONECTADO:`, error);
      }
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

    // Verificar que el conductor existe
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: driverId },
    });

    if (!conductor) {
      client.emit('error', { message: `Conductor #${driverId} no encontrado` });
      return;
    }

    // Guardar ambas relaciones
    this.socketToDriver.set(client.id, driverId);
    this.connectedDrivers.set(driverId, client);
    
    // Cambiar estado del conductor a DISPONIBLE cuando se conecta
    try {
      await this.prisma.conductor.update({
        where: { id: driverId },
        data: { estado: 'DISPONIBLE' },
      });
      this.logger.log(`Conductor #${driverId} conectado - Estado actualizado a DISPONIBLE`);
    } catch (error) {
      this.logger.error(`Error al actualizar estado del conductor #${driverId} a DISPONIBLE:`, error);
    }
    
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

      // Verificar si Redis está disponible
      if (!this.redisService.isConnected()) {
        this.logger.warn(
          `Redis no está conectado. No se puede guardar ubicación del conductor #${driverId}`,
        );
        client.emit('error', { message: 'Redis no disponible' });
        return;
      }

      // Guardar en Redis con TTL de 600 segundos (10 minutos)
      // Esto asegura que la ubicación esté disponible incluso si el conductor cambia de vista
      // El TTL se refresca cada vez que se envía una nueva ubicación
      await this.redisService.set(key, value, 600);

      this.logger.log(
        `✅ Ubicación guardada en Redis para conductor #${driverId}: (${lat}, ${lng}) - TTL: 600s (10 min)`,
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

    // Confirmar al conductor (solo emitir evento, sin lógica de frontend)
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

    // Enviar la oferta completa por WebSocket (solo datos estructurados, sin lógica de frontend)
    socket.emit('trip.offer', offer);
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
        // Verificar si Redis está disponible
        if (!this.redisService.isConnected()) {
          this.logger.warn(
            `Redis no está conectado. No se puede inicializar ubicación del conductor #${driverId}`,
          );
          return;
        }

        // Guardar ubicación inicial en Redis
        const value = JSON.stringify({
          lat: Number(conductor.latitudActual),
          lng: Number(conductor.longitudActual),
          timestamp: Date.now(),
          source: 'database', // Indica que viene de BD, no de GPS
        });

        // Guardar con TTL de 600 segundos (10 minutos) para que esté disponible incluso si el conductor cambia de vista
        await this.redisService.set(key, value, 600);
        
        this.logger.log(
          `✅ Ubicación inicial guardada en Redis para conductor #${driverId} desde BD: (${conductor.latitudActual}, ${conductor.longitudActual}) - TTL: 600s (10 min)`,
        );
        
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

