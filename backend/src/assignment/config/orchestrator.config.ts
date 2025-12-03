import { RestaurantInfo } from '../types/assignment.types';

/**
 * Configuración del orquestador de asignaciones.
 */
export const ORCHESTRATOR_CONFIG = {
  /** Delay en segundos antes de procesar pedidos (para permitir agrupación) */
  processingDelaySeconds: 120, // 3 minutos

  /** Tiempo de expiración de una oferta al conductor (segundos) */
  offerExpirationSeconds: 60, // 1 minuto

  /** Máximo de intentos de reasignación si un conductor rechaza */
  maxReassignAttempts: 3,
};

/**
 * Información del restaurante (punto de recogida).
 * En este sistema es un único restaurante.
 */
export const RESTAURANT_INFO: RestaurantInfo = {
  name: 'Restaurante Plaza 24',
  address: 'Plaza 24 de Septiembre, Santa Cruz',
  coordinates: {
    latitude: -17.7833,
    longitude: -63.1821,
  },
};

