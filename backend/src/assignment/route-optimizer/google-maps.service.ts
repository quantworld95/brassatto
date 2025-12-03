import { Injectable, Logger } from '@nestjs/common';
import { Client, DistanceMatrixResponse, TravelMode } from '@googlemaps/google-maps-services-js';
import { Coordinates } from '../utils/haversine.util';

/**
 * Servicio para interactuar con Google Maps APIs.
 * Maneja la comunicación con Google Distance Matrix API.
 */
@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly client: Client;
  private readonly apiKey: string;

  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️  GOOGLE_MAPS_API_KEY no configurada. El servicio no funcionará.',
      );
    }
  }

  /**
   * Obtiene la matriz de distancias y tiempos entre múltiples puntos
   * usando Google Distance Matrix API.
   *
   * @param points - Array de coordenadas
   * @returns Matriz NxN con distancias en km y tiempos en minutos
   */
  async getDistanceMatrix(
    points: Coordinates[],
  ): Promise<{ distances: number[][]; durations: number[][] }> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY no está configurada');
    }

    if (points.length === 0) {
      return { distances: [], durations: [] };
    }

    if (points.length === 1) {
      return { distances: [[0]], durations: [[0]] };
    }

    try {
      this.logger.debug(
        `Solicitando matriz de distancias para ${points.length} puntos`,
      );

      // Convertir coordenadas al formato de Google
      const locations = points.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
      }));

      // Llamada a Google Distance Matrix API
      const response: DistanceMatrixResponse = await this.client.distancematrix({
        params: {
          origins: locations,
          destinations: locations,
          mode: TravelMode.driving,
          departure_time: new Date(), // Considera tráfico actual
          key: this.apiKey,
        },
        timeout: 5000, // 5 segundos
      });

      if (response.data.status !== 'OK') {
        throw new Error(
          `Google Distance Matrix API error: ${response.data.status}`,
        );
      }

      // Parsear respuesta a matrices
      const n = points.length;
      const distances: number[][] = Array(n)
        .fill(null)
        .map(() => Array(n).fill(0));
      const durations: number[][] = Array(n)
        .fill(null)
        .map(() => Array(n).fill(0));

      for (let i = 0; i < n; i++) {
        const row = response.data.rows[i];
        if (!row) continue;

        for (let j = 0; j < n; j++) {
          const element = row.elements[j];
          if (!element) continue;

          if (element.status === 'OK') {
            // Convertir metros a kilómetros
            distances[i][j] = element.distance.value / 1000;
            // Convertir segundos a minutos
            durations[i][j] = element.duration.value / 60;
          } else {
            this.logger.warn(
              `No se pudo calcular distancia entre punto ${i} y ${j}: ${element.status}`,
            );
            // Usar valor alto para indicar que no hay ruta
            distances[i][j] = 9999;
            durations[i][j] = 9999;
          }
        }
      }

      this.logger.debug(
        `Matriz de distancias obtenida exitosamente (${n}x${n})`,
      );

      return { distances, durations };
    } catch (error) {
      this.logger.error('Error al obtener matriz de distancias de Google:', error);
      throw new Error(
        `Error al comunicarse con Google Maps API: ${error.message}`,
      );
    }
  }

  /**
   * Valida que la API Key esté configurada.
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Obtiene información sobre los límites de uso.
   * Nota: Este método no hace llamadas a la API, solo retorna info.
   */
  getUsageInfo(): {
    configured: boolean;
    costPerElement: number;
    elementsPerRequest: (origins: number, destinations: number) => number;
  } {
    return {
      configured: this.isConfigured(),
      costPerElement: 0.005, // $5 USD por 1000 elementos
      elementsPerRequest: (origins: number, destinations: number) =>
        origins * destinations,
    };
  }
}

