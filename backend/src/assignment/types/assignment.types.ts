import { Coordinates } from '../utils/haversine.util';

/**
 * Tipos e interfaces para el sistema de asignación de pedidos a conductores.
 * Estas estructuras se usan SOLO EN MEMORIA hasta que el conductor acepta.
 */

// ==================== CONFIGURACIÓN ====================

export interface AssignmentConfig {
  /** Radio máximo en km para buscar conductores */
  maxDriverRadiusKm: number;
  /** Radio para clustering de clientes (eps de DBSCAN) en km */
  clusterRadiusKm: number;
  /** Máximo de pedidos por batch */
  maxOrdersPerBatch: number;
  /** Mínimo de pedidos para formar un batch (puede ser 1 para enviar individual) */
  minOrdersPerBatch: number;
  /** Tiempo máximo de espera para formar batch (segundos) */
  maxWaitTimeSeconds: number;
  /** Peso para ETA en el score del conductor */
  weightEta: number;
  /** Peso para tiempo inactivo en el score del conductor */
  weightIdleTime: number;
  /** Velocidad promedio en ciudad (km/h) para estimar ETA */
  avgSpeedKmh: number;
  /** Tiempo de expiración de la oferta al conductor (segundos) */
  offerExpirationSeconds: number;
}

export const DEFAULT_ASSIGNMENT_CONFIG: AssignmentConfig = {
  maxDriverRadiusKm: 3,
  clusterRadiusKm: 1.5,
  maxOrdersPerBatch: 3,
  minOrdersPerBatch: 1,
  maxWaitTimeSeconds: 600, // 10 minutos
  weightEta: 1.0,
  weightIdleTime: 0.5,
  avgSpeedKmh: 25,
  offerExpirationSeconds: 180, // 3 minutos
};

// ==================== DATOS DE ENTRADA ====================

/**
 * Pedido elegible para ser asignado.
 * Representa un Order con status = READY_FOR_PICKUP
 */
export interface EligibleOrder {
  id: number;
  clienteId: number;
  /** Coordenadas del cliente (destino de entrega) */
  coordinates: Coordinates;
  address: string | null;
  total: number;
  /** Timestamp cuando el pedido quedó listo */
  readyAt: Date;
  /** Notas adicionales del pedido */
  notes: string | null;
}

/**
 * Conductor disponible para recibir ofertas.
 */
export interface AvailableDriver {
  id: number;
  usuarioId: number;
  nombre: string;
  telefono: string;
  placa: string;
  /** Coordenadas actuales del conductor */
  coordinates: Coordinates;
  /** Timestamp del último viaje completado (para calcular idle time) */
  lastCompletedAt: Date | null;
}

/**
 * Información del restaurante (punto de recogida).
 * En este sistema es un único restaurante con coordenadas fijas.
 */
export interface RestaurantInfo {
  name: string;
  coordinates: Coordinates;
  address: string;
}

// ==================== ESTRUCTURAS INTERMEDIAS (EN MEMORIA) ====================

/**
 * Propuesta de batch generada por el clustering.
 * Aún no está asignada a ningún conductor.
 */
export interface BatchProposal {
  /** ID temporal del batch (solo para tracking en memoria) */
  tempId: string;
  /** IDs de los pedidos agrupados */
  orderIds: number[];
  /** Pedidos completos incluidos en el batch */
  orders: EligibleOrder[];
  /** Centroide del cluster (promedio de coordenadas de clientes) */
  centroid: Coordinates;
  /** Timestamp del pedido más antiguo del batch */
  oldestOrderTime: Date;
  /** Distancia total estimada del batch (km) */
  estimatedDistanceKm: number;
}

/**
 * Candidato de conductor evaluado para un batch específico.
 */
export interface DriverCandidate {
  driver: AvailableDriver;
  /** Distancia Haversine al restaurante (km) */
  distanceToRestaurantKm: number;
  /** ETA estimado al restaurante (minutos) */
  etaMinutes: number;
  /** Minutos inactivo desde último viaje */
  idleMinutes: number;
  /** Score calculado (menor es mejor) */
  score: number;
}

/**
 * Asignación tentativa de batch a conductor.
 * Aún no confirmada hasta que el conductor acepte.
 */
export interface TentativeAssignment {
  batch: BatchProposal;
  driver: AvailableDriver;
  /** Score del conductor seleccionado */
  driverScore: number;
  /** Ruta óptima calculada (orden de los stops) */
  optimizedRoute: OptimizedStop[];
  /** Distancia total de la ruta (km) */
  totalDistanceKm: number;
  /** Tiempo total estimado (minutos) */
  totalTimeMinutes: number;
  /** Ganancia estimada para el conductor */
  estimatedEarnings: number;
}

/**
 * Parada optimizada con su secuencia en la ruta.
 */
export interface OptimizedStop {
  orderId: number;
  sequence: number;
  coordinates: Coordinates;
  address: string | null;
  /** ETA estimado a esta parada desde la anterior */
  etaFromPreviousMinutes: number;
  /** Distancia desde la parada anterior (km) */
  distanceFromPreviousKm: number;
}

// ==================== OFERTA AL CONDUCTOR ====================

/**
 * Oferta de viaje enviada al conductor (Trip Request Card).
 * Esta es la estructura que se envía por WebSocket.
 */
export interface TripOffer {
  /** ID único de la oferta */
  offerId: string;
  /** ID del conductor al que se envía */
  driverId: number;
  /** Timestamp de creación de la oferta */
  createdAt: Date;
  /** Timestamp de expiración */
  expiresAt: Date;
  /** Información del restaurante */
  restaurant: {
    name: string;
    address: string;
    coordinates: Coordinates;
  };
  /** Paradas en orden óptimo */
  stops: TripOfferStop[];
  /** Resumen de la oferta */
  summary: {
    totalOrders: number;
    totalDistanceKm: number;
    estimatedTimeMinutes: number;
    estimatedEarnings: number;
  };
  /** Datos internos (no mostrar al conductor, usar para persistencia si acepta) */
  _internal: {
    batchTempId: string;
    orderIds: number[];
    optimizedRoute: OptimizedStop[];
  };
}

/**
 * Parada individual en la oferta de viaje.
 */
export interface TripOfferStop {
  sequence: number;
  address: string | null;
  /** Solo mostrar zona aproximada, no dirección exacta */
  approximateZone: string;
  etaMinutes: number;
}

// ==================== RESPUESTAS DEL CONDUCTOR ====================

export type OfferResponse = 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface OfferResult {
  offerId: string;
  driverId: number;
  response: OfferResponse;
  respondedAt: Date;
}

// ==================== RESULTADO DE PERSISTENCIA ====================

/**
 * Resultado después de persistir en BD (cuando el conductor acepta).
 */
export interface PersistedBatch {
  batchId: number;
  driverId: number;
  stops: Array<{
    stopId: number;
    orderId: number;
    sequence: number;
  }>;
}

