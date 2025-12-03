/**
 * Utilidad para cálculo de distancia Haversine entre dos puntos geográficos.
 * Fórmula: https://en.wikipedia.org/wiki/Haversine_formula
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Convierte grados a radianes
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcula la distancia en kilómetros entre dos puntos usando la fórmula Haversine.
 * Esta es una distancia "en línea recta" sobre la superficie terrestre,
 * NO considera rutas reales por calles.
 *
 * @param from - Coordenadas del punto de origen
 * @param to - Coordenadas del punto de destino
 * @returns Distancia en kilómetros
 */
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Estima el tiempo de llegada (ETA) en minutos basándose en distancia Haversine.
 * Usa una velocidad promedio configurable.
 *
 * @param from - Coordenadas del punto de origen
 * @param to - Coordenadas del punto de destino
 * @param avgSpeedKmh - Velocidad promedio en km/h (default: 25 km/h para ciudad)
 * @returns Tiempo estimado en minutos
 */
export function estimateETA(
  from: Coordinates,
  to: Coordinates,
  avgSpeedKmh: number = 25,
): number {
  const distanceKm = haversineDistance(from, to);
  const timeHours = distanceKm / avgSpeedKmh;
  return timeHours * 60; // Convertir a minutos
}

/**
 * Verifica si un punto está dentro de un radio desde otro punto.
 *
 * @param center - Coordenadas del centro
 * @param point - Coordenadas del punto a verificar
 * @param radiusKm - Radio máximo en kilómetros
 * @returns true si el punto está dentro del radio
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number,
): boolean {
  return haversineDistance(center, point) <= radiusKm;
}

/**
 * Construye una matriz de distancias entre múltiples puntos.
 * Útil para el algoritmo TSP (ruta óptima).
 *
 * @param points - Array de coordenadas
 * @returns Matriz NxN donde matrix[i][j] = distancia de punto i a punto j
 */
export function buildDistanceMatrix(points: Coordinates[]): number[][] {
  const n = points.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = haversineDistance(points[i], points[j]);
      }
    }
  }

  return matrix;
}

