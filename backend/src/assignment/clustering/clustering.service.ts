import { Injectable, Logger } from '@nestjs/common';
import * as DBSCAN from 'density-clustering';
import { PrismaService } from '../../prisma/prisma.service';
import {
  haversineDistance,
  Coordinates,
} from '../utils/haversine.util';
import {
  EligibleOrder,
  BatchProposal,
  AssignmentConfig,
  DEFAULT_ASSIGNMENT_CONFIG,
} from '../types/assignment.types';

/**
 * Servicio de Clustering - FASE A del algoritmo de asignación.
 *
 * Responsabilidades:
 * 1. Obtener pedidos elegibles (READY_FOR_PICKUP)
 * 2. Agruparlos por cercanía geográfica usando DBSCAN
 * 3. Post-procesar clusters (limitar tamaño, manejar outliers)
 * 4. Generar BatchProposals (en memoria, sin persistencia)
 */
@Injectable()
export class ClusteringService {
  private readonly logger = new Logger(ClusteringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los pedidos elegibles para ser batcheados.
   * Condiciones:
   * - status = READY_FOR_PICKUP
   * - Tiene coordenadas del cliente
   * - No está ya asignado a un DeliveryStop
   * - Fue actualizado recientemente (últimas 24 horas) para evitar pedidos antiguos huérfanos
   */
  async getEligibleOrders(): Promise<EligibleOrder[]> {
    // Filtro de tiempo: solo considerar pedidos actualizados en las últimas 24 horas
    // Esto evita incluir pedidos antiguos que quedaron huérfanos en la BD
    const maxAgeHours = 24;
    const minUpdatedAt = new Date();
    minUpdatedAt.setHours(minUpdatedAt.getHours() - maxAgeHours);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'READY_FOR_PICKUP',
        latitude: { not: null },
        longitude: { not: null },
        // No debe estar ya en un DeliveryStop (ya asignado a un batch)
        deliveryStop: null,
        // Solo considerar pedidos actualizados recientemente (últimas 24 horas)
        // Esto excluye pedidos antiguos que pueden haber quedado huérfanos
        updatedAt: {
          gte: minUpdatedAt,
        },
      },
      include: {
        cliente: {
          include: {
            usuario: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc', // Los más antiguos primero (dentro del rango de 24h)
      },
    });

    return orders.map((order) => ({
      id: order.id,
      clienteId: order.clienteId,
      coordinates: {
        latitude: Number(order.latitude),
        longitude: Number(order.longitude),
      },
      address: order.address,
      total: Number(order.total),
      readyAt: order.updatedAt, // Asumimos que updatedAt es cuando cambió a READY_FOR_PICKUP
      notes: order.notes,
    }));
  }

  /**
   * Agrupa pedidos elegibles en batches usando DBSCAN.
   *
   * @param orders - Pedidos a agrupar
   * @param config - Configuración del algoritmo
   * @returns Array de BatchProposals (clusters de pedidos)
   */
  clusterOrders(
    orders: EligibleOrder[],
    config: AssignmentConfig = DEFAULT_ASSIGNMENT_CONFIG,
  ): BatchProposal[] {
    if (orders.length === 0) {
      this.logger.debug('No hay pedidos elegibles para clustering');
      return [];
    }

    // Si solo hay un pedido, crear batch individual
    if (orders.length === 1) {
      return [this.createBatchProposal(orders)];
    }

    // Preparar datos para DBSCAN: array de [lat, lng]
    const points = orders.map((o) => [
      o.coordinates.latitude,
      o.coordinates.longitude,
    ]);

    // DBSCAN usa distancia euclidiana por defecto, necesitamos adaptar eps
    // Convertimos el radio en km a una aproximación en grados
    // ~111km = 1 grado de latitud (aproximación)
    const epsInDegrees = config.clusterRadiusKm / 111;

    const dbscan = new DBSCAN.DBSCAN();
    // minPts = 1 para permitir clusters pequeños
    const clusters = dbscan.run(points, epsInDegrees, 1);

    this.logger.debug(
      `DBSCAN generó ${clusters.length} clusters de ${orders.length} pedidos`,
    );

    // Procesar clusters y noise points
    const batches: BatchProposal[] = [];

    // Procesar cada cluster
    for (const clusterIndices of clusters) {
      const clusterOrders = clusterIndices.map((i: number) => orders[i]);
      const splitBatches = this.splitClusterIfNeeded(
        clusterOrders,
        config.maxOrdersPerBatch,
      );
      batches.push(...splitBatches);
    }

    // Procesar noise points (pedidos que no entraron en ningún cluster)
    const clusteredIndices = new Set(clusters.flat());
    const noiseOrders = orders.filter((_, i) => !clusteredIndices.has(i));

    // Cada noise point se convierte en batch individual (si se permite)
    if (config.minOrdersPerBatch <= 1) {
      for (const order of noiseOrders) {
        batches.push(this.createBatchProposal([order]));
      }
    } else {
      this.logger.warn(
        `${noiseOrders.length} pedidos no pudieron ser agrupados (minOrdersPerBatch = ${config.minOrdersPerBatch})`,
      );
    }

    this.logger.log(
      `Clustering completado: ${batches.length} batches generados`,
    );

    return batches;
  }

  /**
   * Divide un cluster si excede el máximo de pedidos por batch.
   * Usa un enfoque simple: divide por cercanía al centroide.
   */
  private splitClusterIfNeeded(
    orders: EligibleOrder[],
    maxPerBatch: number,
  ): BatchProposal[] {
    if (orders.length <= maxPerBatch) {
      return [this.createBatchProposal(orders)];
    }

    const batches: BatchProposal[] = [];
    const remaining = [...orders];

    while (remaining.length > 0) {
      // Tomar los primeros N pedidos más cercanos entre sí
      const batchOrders = remaining.splice(0, maxPerBatch);
      batches.push(this.createBatchProposal(batchOrders));
    }

    return batches;
  }

  /**
   * Crea un BatchProposal a partir de un conjunto de pedidos.
   */
  private createBatchProposal(orders: EligibleOrder[]): BatchProposal {
    const centroid = this.calculateCentroid(orders);
    const oldestOrderTime = orders.reduce(
      (oldest, o) => (o.readyAt < oldest ? o.readyAt : oldest),
      orders[0].readyAt,
    );

    // Estimar distancia total del batch (simplificado: suma de distancias al centroide * 2)
    let estimatedDistanceKm = 0;
    for (let i = 0; i < orders.length; i++) {
      if (i === 0) {
        estimatedDistanceKm += haversineDistance(centroid, orders[i].coordinates);
      } else {
        estimatedDistanceKm += haversineDistance(
          orders[i - 1].coordinates,
          orders[i].coordinates,
        );
      }
    }

    return {
      tempId: this.generateTempId(),
      orderIds: orders.map((o) => o.id),
      orders,
      centroid,
      oldestOrderTime,
      estimatedDistanceKm,
    };
  }

  /**
   * Calcula el centroide (punto medio) de un conjunto de coordenadas.
   */
  private calculateCentroid(orders: EligibleOrder[]): Coordinates {
    const sumLat = orders.reduce((sum, o) => sum + o.coordinates.latitude, 0);
    const sumLng = orders.reduce((sum, o) => sum + o.coordinates.longitude, 0);

    return {
      latitude: sumLat / orders.length,
      longitude: sumLng / orders.length,
    };
  }

  /**
   * Genera un ID temporal único para el batch.
   */
  private generateTempId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Método principal: obtiene pedidos elegibles y los agrupa.
   *
   * @param config - Configuración opcional
   * @returns Array de BatchProposals listos para asignar a conductores
   */
  async createBatches(
    config: AssignmentConfig = DEFAULT_ASSIGNMENT_CONFIG,
  ): Promise<BatchProposal[]> {
    this.logger.log('Iniciando proceso de clustering...');

    const eligibleOrders = await this.getEligibleOrders();
    this.logger.log(`Encontrados ${eligibleOrders.length} pedidos elegibles`);

    if (eligibleOrders.length === 0) {
      return [];
    }

    const batches = this.clusterOrders(eligibleOrders, config);

    // Log resumen
    for (const batch of batches) {
      this.logger.debug(
        `Batch ${batch.tempId}: ${batch.orderIds.length} pedidos, ` +
          `distancia estimada: ${batch.estimatedDistanceKm.toFixed(2)} km`,
      );
    }

    return batches;
  }
}

