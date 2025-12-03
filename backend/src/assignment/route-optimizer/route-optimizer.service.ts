import { Injectable, Logger } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import {
  BatchProposal,
  OptimizedStop,
  RestaurantInfo,
} from '../types/assignment.types';
import { Coordinates } from '../utils/haversine.util';

/**
 * Servicio de Optimización de Rutas - FASE C del algoritmo de asignación.
 *
 * Responsabilidades:
 * 1. Construir matriz de distancias usando Google Distance Matrix API
 * 2. Resolver TSP (Traveling Salesman Problem) para encontrar la ruta óptima
 * 3. Generar el orden de paradas (stops) con distancias y ETAs
 */
@Injectable()
export class RouteOptimizerService {
  private readonly logger = new Logger(RouteOptimizerService.name);

  constructor(private readonly googleMapsService: GoogleMapsService) {}

  /**
   * Genera todas las permutaciones posibles de un array.
   * Se usa para probar todas las rutas posibles en el TSP.
   */
  private generatePermutations<T>(arr: T[]): T[][] {
    if (arr.length === 0) return [[]];
    if (arr.length === 1) return [arr];

    const result: T[][] = [];

    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const permutations = this.generatePermutations(remaining);

      for (const perm of permutations) {
        result.push([current, ...perm]);
      }
    }

    return result;
  }

  /**
   * Calcula la distancia total de una ruta específica.
   *
   * @param route - Índices de los puntos en orden de visita
   * @param distanceMatrix - Matriz de distancias entre puntos
   * @returns Distancia total en km
   */
  private calculateRouteDistance(
    route: number[],
    distanceMatrix: number[][],
  ): number {
    let totalDistance = 0;

    for (let i = 0; i < route.length - 1; i++) {
      const from = route[i];
      const to = route[i + 1];
      totalDistance += distanceMatrix[from][to];
    }

    return totalDistance;
  }

  /**
   * Resuelve el problema del viajante (TSP) usando fuerza bruta.
   * Funciona bien para grupos pequeños (2-8 puntos).
   *
   * @param distanceMatrix - Matriz NxN de distancias
   * @param startIndex - Índice del punto de inicio (restaurante)
   * @returns Array de índices en orden óptimo [startIndex, p1, p2, ...]
   */
  private solveTSP(distanceMatrix: number[][], startIndex: number): number[] {
    const n = distanceMatrix.length;

    // Si solo hay el punto de inicio, retornar solo ese
    if (n === 1) return [startIndex];

    // Si hay solo 2 puntos (restaurante + 1 cliente), no hay optimización
    if (n === 2) return [0, 1];

    // Generar índices de clientes (sin el restaurante que está en startIndex)
    const clientIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== startIndex) {
        clientIndices.push(i);
      }
    }

    // Generar todas las permutaciones de clientes
    const permutations = this.generatePermutations(clientIndices);

    this.logger.debug(
      `Evaluando ${permutations.length} permutaciones para ${clientIndices.length} clientes`,
    );

    // Encontrar la permutación con menor distancia
    let bestRoute: number[] = [];
    let bestDistance = Infinity;

    for (const perm of permutations) {
      // Ruta completa: restaurante → cliente1 → cliente2 → ...
      const route = [startIndex, ...perm];
      const distance = this.calculateRouteDistance(route, distanceMatrix);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestRoute = route;
      }
    }

    this.logger.debug(
      `Ruta óptima encontrada con distancia total: ${bestDistance.toFixed(2)} km`,
    );

    return bestRoute;
  }

  /**
   * Optimiza la ruta de entrega para un batch específico.
   *
   * @param batch - Batch con los pedidos a entregar
   * @param restaurant - Información del restaurante (punto de inicio)
   * @returns Array de stops optimizados con distancias y ETAs
   */
  async optimizeRoute(
    batch: BatchProposal,
    restaurant: RestaurantInfo,
  ): Promise<OptimizedStop[]> {
    this.logger.log(`Optimizando ruta para batch ${batch.tempId.slice(-8)}`);

    // Caso especial: batch con un solo pedido
    if (batch.orders.length === 1) {
      const order = batch.orders[0];
      
      // Obtener distancia real del restaurante al cliente
      const { distances, durations } = await this.googleMapsService.getDistanceMatrix([
        restaurant.coordinates,
        order.coordinates,
      ]);

      return [
        {
          orderId: order.id,
          sequence: 1,
          coordinates: order.coordinates,
          address: order.address,
          distanceFromPreviousKm: distances[0][1],
          etaFromPreviousMinutes: durations[0][1],
        },
      ];
    }

    // Construir lista de puntos: [restaurante, cliente1, cliente2, ...]
    const points: Coordinates[] = [
      restaurant.coordinates,
      ...batch.orders.map((o) => o.coordinates),
    ];

    // Obtener matriz de distancias desde Google Maps API
    const { distances, durations } = await this.googleMapsService.getDistanceMatrix(
      points,
    );

    // Resolver TSP (índice 0 = restaurante)
    const optimalRoute = this.solveTSP(distances, 0);

    // Construir stops en el orden óptimo
    const optimizedStops: OptimizedStop[] = [];

    for (let i = 1; i < optimalRoute.length; i++) {
      const currentIndex = optimalRoute[i];
      const previousIndex = optimalRoute[i - 1];

      // currentIndex - 1 porque el índice 0 es el restaurante
      const order = batch.orders[currentIndex - 1];

      optimizedStops.push({
        orderId: order.id,
        sequence: i,
        coordinates: order.coordinates,
        address: order.address,
        distanceFromPreviousKm: distances[previousIndex][currentIndex],
        etaFromPreviousMinutes: durations[previousIndex][currentIndex],
      });
    }

    // Log de la ruta optimizada
    const totalDistance = optimizedStops.reduce(
      (sum, stop) => sum + stop.distanceFromPreviousKm,
      0,
    );
    const totalTime = optimizedStops.reduce(
      (sum, stop) => sum + stop.etaFromPreviousMinutes,
      0,
    );

    this.logger.log(
      `Ruta optimizada: ${optimizedStops.map((s) => `Order#${s.orderId}`).join(' → ')}`,
    );
    this.logger.log(
      `Distancia total: ${totalDistance.toFixed(2)} km, Tiempo total: ${totalTime.toFixed(1)} min`,
    );

    return optimizedStops;
  }

  /**
   * Optimiza múltiples batches en paralelo.
   *
   * @param batches - Array de batches a optimizar
   * @param restaurant - Información del restaurante
   * @returns Map de batchId → OptimizedStops
   */
  async optimizeMultipleBatches(
    batches: BatchProposal[],
    restaurant: RestaurantInfo,
  ): Promise<Map<string, OptimizedStop[]>> {
    this.logger.log(`Optimizando rutas para ${batches.length} batches...`);

    const results = new Map<string, OptimizedStop[]>();

    // Procesar en paralelo
    const promises = batches.map(async (batch) => {
      const stops = await this.optimizeRoute(batch, restaurant);
      return { batchId: batch.tempId, stops };
    });

    const optimized = await Promise.all(promises);

    for (const { batchId, stops } of optimized) {
      results.set(batchId, stops);
    }

    this.logger.log('Optimización de rutas completada');
    return results;
  }
}

