import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TripOffer, PersistedBatch } from '../types/assignment.types';

/**
 * Servicio de Persistencia - FASE E del algoritmo de asignación.
 *
 * Responsabilidades:
 * - Crear DeliveryBatch y DeliveryStops en BD cuando el conductor acepta
 * - Actualizar estados de conductor y pedidos
 * - Manejar transacciones atómicas
 */
@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste una oferta aceptada en la base de datos.
   * Crea DeliveryBatch, DeliveryStops y actualiza estados.
   *
   * @param offer - Oferta aceptada por el conductor
   * @returns Información del batch persistido
   */
  async persistAcceptedOffer(offer: TripOffer): Promise<PersistedBatch> {
    this.logger.log(
      `Persistiendo oferta aceptada ${offer.offerId} para conductor #${offer.driverId}`,
    );

    try {
      // Usar transacción para garantizar atomicidad
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Crear DeliveryBatch
        const batch = await tx.deliveryBatch.create({
          data: {
            conductorId: offer.driverId,
            status: 'ASSIGNED',
            startTime: null,
            endTime: null,
          },
        });

        this.logger.debug(`DeliveryBatch #${batch.id} creado`);

        // 2. Crear DeliveryStops en el orden optimizado
        const stops = [];
        for (const stop of offer._internal.optimizedRoute) {
          const deliveryStop = await tx.deliveryStop.create({
            data: {
              batchId: batch.id,
              orderId: stop.orderId,
              sequence: stop.sequence,
              stopStatus: 'PENDING',
              plannedAt: null,
              arrivedAt: null,
              leftAt: null,
            },
          });

          stops.push({
            stopId: deliveryStop.id,
            orderId: stop.orderId,
            sequence: stop.sequence,
          });

          this.logger.debug(
            `DeliveryStop #${deliveryStop.id} creado para Order #${stop.orderId} (sequence: ${stop.sequence})`,
          );
        }

        // 3. Actualizar estado del conductor a OCUPADO
        await tx.conductor.update({
          where: { id: offer.driverId },
          data: { estado: 'OCUPADO' },
        });

        this.logger.debug(`Conductor #${offer.driverId} actualizado a OCUPADO`);

        // 4. (Opcional) Actualizar estado de los pedidos
        // Nota: Los pedidos siguen en READY_FOR_PICKUP hasta que el conductor los recoge
        // Esto se manejará en otro flujo cuando el conductor inicie el viaje

        return {
          batchId: batch.id,
          driverId: offer.driverId,
          stops,
        };
      });

      this.logger.log(
        `✅ Oferta ${offer.offerId} persistida exitosamente. Batch #${result.batchId} creado con ${result.stops.length} stops`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Error al persistir oferta ${offer.offerId}:`,
        error,
      );
      throw new Error(
        `Error al persistir oferta en BD: ${error.message}`,
      );
    }
  }

  /**
   * Maneja el rechazo de una oferta.
   * No persiste nada en BD, solo para logging.
   *
   * @param offerId - ID de la oferta rechazada
   */
  async handleRejection(offerId: string): Promise<void> {
    this.logger.log(`Oferta ${offerId} rechazada por el conductor`);
    // No hay nada que persistir, solo logging
  }

  /**
   * Maneja la expiración de una oferta.
   * Similar al rechazo, no persiste nada.
   *
   * @param offerId - ID de la oferta expirada
   */
  async handleExpiration(offerId: string): Promise<void> {
    this.logger.log(`Oferta ${offerId} expirada`);
    // No hay nada que persistir, solo logging
  }
}

