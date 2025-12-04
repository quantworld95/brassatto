import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import {
  BatchProposal,
  AvailableDriver,
  DriverCandidate,
  TentativeAssignment,
  RestaurantInfo,
  AssignmentConfig,
  DEFAULT_ASSIGNMENT_CONFIG,
} from '../types/assignment.types';
import { isWithinRadius, Coordinates } from '../utils/haversine.util';
import { ETAProvider, HaversineETAProvider } from '../utils/eta-provider.interface';

/**
 * Servicio de Selección de Conductores - FASE B del algoritmo de asignación.
 *
 * Responsabilidades:
 * 1. Obtener conductores disponibles
 * 2. Filtrar por radio al restaurante
 * 3. Calcular score para cada conductor (ETA + idle time)
 * 4. Asignar batches a conductores de forma greedy
 */
@Injectable()
export class DriverSelectionService {
  private readonly logger = new Logger(DriverSelectionService.name);
  private readonly etaProvider: ETAProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    // Por defecto usa implementación MVP (Haversine)
    this.etaProvider = new HaversineETAProvider(DEFAULT_ASSIGNMENT_CONFIG.avgSpeedKmh);
  }

  /**
   * Obtiene los conductores disponibles de la base de datos.
   * Intenta obtener la posición actualizada de Redis, con fallback a BD.
   */
  async getAvailableDrivers(): Promise<AvailableDriver[]> {
    const conductores = await this.prisma.conductor.findMany({
      where: {
        estado: 'DISPONIBLE',
        latitudActual: { not: null },
        longitudActual: { not: null },
      },
      include: {
        usuario: true,
      },
    });

    const drivers: AvailableDriver[] = [];

    for (const c of conductores) {
      // Intentar obtener posición actualizada de Redis
      let coordinates: { latitude: number; longitude: number };

      // Verificar si Redis está conectado
      const isRedisConnected = this.redisService.isConnected();
      
      if (!isRedisConnected) {
        this.logger.warn(
          `Redis no está conectado. Usando posición de BD para conductor #${c.id}`,
        );
        coordinates = {
          latitude: Number(c.latitudActual),
          longitude: Number(c.longitudActual),
        };
      } else {
        try {
          const key = `driver:${c.id}:location`;
          const locationJson = await this.redisService.get(key);

          if (locationJson) {
            // Parsear JSON de Redis
            const location = JSON.parse(locationJson);
            coordinates = {
              latitude: location.lat,
              longitude: location.lng,
            };

            this.logger.log(
              `✅ Posición obtenida de Redis para conductor #${c.id}: (${location.lat}, ${location.lng})`,
            );
          } else {
            // Fallback a BD si no hay en Redis
            coordinates = {
              latitude: Number(c.latitudActual),
              longitude: Number(c.longitudActual),
            };

            this.logger.warn(
              `⚠️ No hay ubicación en Redis para conductor #${c.id}. Usando posición de BD: (${c.latitudActual}, ${c.longitudActual})`,
            );
          }
        } catch (error) {
          // Si hay error con Redis, usar BD como fallback
          this.logger.warn(
            `Error al leer de Redis para conductor #${c.id}, usando BD:`,
            error,
          );
          coordinates = {
            latitude: Number(c.latitudActual),
            longitude: Number(c.longitudActual),
          };
        }
      }

      drivers.push({
        id: c.id,
        usuarioId: c.usuarioId,
        nombre: c.usuario.nombre,
        telefono: c.usuario.telefono,
        placa: c.placa,
        coordinates,
        lastCompletedAt: null, // TODO: obtener del último DeliveryBatch completado
      });
    }

    return drivers;
  }

  /**
   * Filtra conductores que estén dentro del radio máximo al restaurante.
   */
  filterByRadius(
    drivers: AvailableDriver[],
    restaurant: Coordinates,
    maxRadiusKm: number,
  ): AvailableDriver[] {
    const filtered = drivers.filter((driver) =>
      isWithinRadius(restaurant, driver.coordinates, maxRadiusKm),
    );

    this.logger.debug(
      `Filtrados ${filtered.length} de ${drivers.length} conductores dentro de ${maxRadiusKm} km`,
    );

    return filtered;
  }

  /**
   * Calcula el score de un conductor para un batch específico.
   * 
   * Score = (w1 × ETA) - (w2 × idleMinutes)
   * 
   * - Menor score es mejor
   * - ETA alto aumenta el score (peor)
   * - Idle time alto reduce el score (mejor, porque prioriza conductores esperando)
   */
  async calculateDriverScore(
    driver: AvailableDriver,
    restaurant: Coordinates,
    config: AssignmentConfig,
  ): Promise<DriverCandidate> {
    // 1. Calcular ETA del conductor al restaurante
    const etaMinutes = await this.etaProvider.calculateETA(
      driver.coordinates,
      restaurant,
    );

    // 2. Calcular tiempo inactivo del conductor (minutos)
    const idleMinutes = driver.lastCompletedAt
      ? (Date.now() - driver.lastCompletedAt.getTime()) / 60000
      : 0;

    // 3. Calcular distancia Haversine (para logging)
    const { haversineDistance } = await import('../utils/haversine.util');
    const distanceToRestaurantKm = haversineDistance(
      driver.coordinates,
      restaurant,
    );

    // 4. Calcular score
    const score =
      config.weightEta * etaMinutes - config.weightIdleTime * idleMinutes;

    return {
      driver,
      distanceToRestaurantKm,
      etaMinutes,
      idleMinutes,
      score,
    };
  }

  /**
   * Encuentra el mejor conductor para un batch específico.
   * Retorna null si no hay conductores disponibles.
   */
  async findBestDriver(
    batch: BatchProposal,
    availableDrivers: AvailableDriver[],
    restaurant: Coordinates,
    config: AssignmentConfig,
  ): Promise<DriverCandidate | null> {
    if (availableDrivers.length === 0) {
      this.logger.warn(`No hay conductores disponibles para batch ${batch.tempId}`);
      return null;
    }

    // Calcular scores de todos los candidatos
    const candidates: DriverCandidate[] = [];
    for (const driver of availableDrivers) {
      const candidate = await this.calculateDriverScore(driver, restaurant, config);
      candidates.push(candidate);
    }

    // Ordenar por score ascendente (menor es mejor)
    candidates.sort((a, b) => a.score - b.score);

    const best = candidates[0];
    this.logger.debug(
      `Mejor conductor para batch ${batch.tempId.slice(-8)}: ` +
        `Driver #${best.driver.id} (${best.driver.nombre}) - ` +
        `Score: ${best.score.toFixed(2)}, ETA: ${best.etaMinutes.toFixed(1)} min, ` +
        `Idle: ${best.idleMinutes.toFixed(0)} min`,
    );

    return best;
  }

  /**
   * Asigna batches a conductores usando estrategia greedy.
   * 
   * Algoritmo:
   * 1. Ordenar batches por antigüedad (oldest first)
   * 2. Para cada batch:
   *    - Encontrar mejor conductor disponible
   *    - Asignar y remover conductor de la pool
   * 3. Batches sin conductor se ignoran (no hay drivers disponibles)
   */
  async assignBatchesToDrivers(
    batches: BatchProposal[],
    restaurant: RestaurantInfo,
    config: AssignmentConfig = DEFAULT_ASSIGNMENT_CONFIG,
  ): Promise<TentativeAssignment[]> {
    this.logger.log('Iniciando asignación de batches a conductores...');

    // Paso 1: Obtener todos los conductores disponibles
    const allDrivers = await this.getAvailableDrivers();
    this.logger.log(`Encontrados ${allDrivers.length} conductores disponibles`);

    if (allDrivers.length === 0) {
      this.logger.warn('No hay conductores disponibles para asignar batches');
      return [];
    }

    // Paso 2: Filtrar por radio al restaurante
    const eligibleDrivers = this.filterByRadius(
      allDrivers,
      restaurant.coordinates,
      config.maxDriverRadiusKm,
    );

    if (eligibleDrivers.length === 0) {
      this.logger.warn(
        `No hay conductores dentro de ${config.maxDriverRadiusKm} km del restaurante`,
      );
      return [];
    }

    // Paso 3: Ordenar batches por antigüedad (FIFO)
    const sortedBatches = [...batches].sort(
      (a, b) => a.oldestOrderTime.getTime() - b.oldestOrderTime.getTime(),
    );

    // Paso 4: Asignación greedy
    const assignments: TentativeAssignment[] = [];
    const reservedDriverIds = new Set<number>();

    for (const batch of sortedBatches) {
      // Conductores aún no asignados en esta ronda
      const availableDrivers = eligibleDrivers.filter(
        (d) => !reservedDriverIds.has(d.id),
      );

      if (availableDrivers.length === 0) {
        this.logger.warn(
          `No quedan conductores para batch ${batch.tempId.slice(-8)}`,
        );
        continue;
      }

      // Encontrar mejor conductor
      const bestCandidate = await this.findBestDriver(
        batch,
        availableDrivers,
        restaurant.coordinates,
        config,
      );

      if (!bestCandidate) {
        continue;
      }

      // Crear asignación tentativa (aún no persiste en BD)
      const assignment: TentativeAssignment = {
        batch,
        driver: bestCandidate.driver,
        driverScore: bestCandidate.score,
        optimizedRoute: [], // Se llenará en FASE C
        totalDistanceKm: batch.estimatedDistanceKm,
        totalTimeMinutes: bestCandidate.etaMinutes + batch.estimatedDistanceKm * 2.4, // aprox
        estimatedEarnings: this.calculateEarnings(batch),
      };

      assignments.push(assignment);
      reservedDriverIds.add(bestCandidate.driver.id);

      this.logger.log(
        `✅ Batch ${batch.tempId.slice(-8)} → Driver #${bestCandidate.driver.id} (${bestCandidate.driver.nombre})`,
      );
    }

    this.logger.log(`Asignación completada: ${assignments.length} batches asignados`);
    return assignments;
  }

  /**
   * Calcula las ganancias estimadas para el conductor.
   * Fórmula simple: base + (pedidos × tarifa)
   */
  private calculateEarnings(batch: BatchProposal): number {
    const BASE_FEE = 10; // Bs
    const PER_ORDER_FEE = 5; // Bs
    return BASE_FEE + batch.orders.length * PER_ORDER_FEE;
  }

  /**
   * Método principal: selecciona conductores para batches.
   * 
   * @param batches - Batches generados por el clustering (FASE A)
   * @param restaurant - Información del restaurante
   * @param config - Configuración opcional
   * @returns Asignaciones tentativas (batch + conductor)
   */
  async selectDriversForBatches(
    batches: BatchProposal[],
    restaurant: RestaurantInfo,
    config: AssignmentConfig = DEFAULT_ASSIGNMENT_CONFIG,
  ): Promise<TentativeAssignment[]> {
    if (batches.length === 0) {
      this.logger.debug('No hay batches para asignar');
      return [];
    }

    return this.assignBatchesToDrivers(batches, restaurant, config);
  }
}

