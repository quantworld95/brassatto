import { Coordinates } from './haversine.util';

/**
 * Interfaz abstracta para cálculo de ETA.
 * Permite intercambiar implementaciones (MVP vs Producción).
 */
export interface ETAProvider {
  /**
   * Calcula el tiempo estimado de llegada (ETA) desde un origen a un destino.
   * @param from - Coordenadas de origen
   * @param to - Coordenadas de destino
   * @returns ETA en minutos
   */
  calculateETA(from: Coordinates, to: Coordinates): Promise<number>;
}

/**
 * Implementación MVP usando distancia Haversine + velocidad promedio.
 * No considera rutas reales por calles, solo distancia en línea recta.
 */
export class HaversineETAProvider implements ETAProvider {
  constructor(private readonly avgSpeedKmh: number = 25) {}

  async calculateETA(from: Coordinates, to: Coordinates): Promise<number> {
    // Importación dinámica para evitar dependencias circulares
    const { estimateETA } = await import('./haversine.util');
    return estimateETA(from, to, this.avgSpeedKmh);
  }
}

/**
 * Implementación futura usando Google Distance Matrix API.
 * Considera rutas reales, tráfico, y restricciones de calles.
 * 
 * TODO: Implementar cuando se integre Google Maps API
 */
export class GoogleDistanceMatrixProvider implements ETAProvider {
  constructor(private readonly apiKey: string) {}

  async calculateETA(from: Coordinates, to: Coordinates): Promise<number> {
    // TODO: Implementar llamada a Google Distance Matrix API
    // const response = await googleMapsClient.distanceMatrix({
    //   origins: [from],
    //   destinations: [to],
    //   mode: 'driving',
    //   departure_time: 'now',
    // });
    // return response.duration.value / 60; // Convertir segundos a minutos
    
    throw new Error('Google Distance Matrix Provider not implemented yet');
  }
}

