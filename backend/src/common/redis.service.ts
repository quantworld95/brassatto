import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Servicio para interactuar con Redis.
 * Maneja conexión, desconexión y operaciones básicas.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  private isRedisAvailable: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 3;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        // Limitar intentos de reconexión
        if (times > this.maxConnectionAttempts) {
          this.logger.warn(
            `Redis no disponible después de ${this.maxConnectionAttempts} intentos. Usando fallback a BD.`,
          );
          return null; // Detener reconexión
        }
        const delay = Math.min(times * 50, 2000);
        // Solo loguear los primeros intentos
        if (times <= 3) {
          this.logger.warn(`Reintentando conexión a Redis (intento ${times}/${this.maxConnectionAttempts})...`);
        }
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // No encolar comandos cuando está offline
      lazyConnect: false, // Conectar inmediatamente
    });

    this.client.on('connect', () => {
      this.isRedisAvailable = true;
      this.connectionAttempts = 0;
      this.logger.log(`✅ Conectado a Redis en ${host}:${port}`);
    });

    this.client.on('error', (error) => {
      this.isRedisAvailable = false;
      // Solo loguear errores críticos, no cada intento de reconexión
      if (this.connectionAttempts === 0) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Redis no disponible. El sistema usará fallback a BD. Error: ${errorMsg}`,
        );
      }
      this.connectionAttempts++;
    });

    this.client.on('close', () => {
      this.isRedisAvailable = false;
      // No loguear cada cierre, solo el primero
      if (this.connectionAttempts <= 1) {
        this.logger.debug('Conexión a Redis cerrada');
      }
    });

    this.client.on('reconnecting', () => {
      // Silenciar logs de reconexión después de los primeros intentos
      if (this.connectionAttempts <= this.maxConnectionAttempts) {
        this.logger.debug('Reconectando a Redis...');
      }
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.logger.log('Desconectado de Redis');
    }
  }

  /**
   * Guarda un valor en Redis con TTL opcional.
   *
   * @param key - Clave
   * @param value - Valor (será convertido a string)
   * @param ttlSeconds - Tiempo de vida en segundos (opcional)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isRedisAvailable) {
      // Silenciosamente fallar si Redis no está disponible
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      // No loguear errores si Redis no está disponible (ya se logueó antes)
      if (this.isRedisAvailable) {
        this.logger.debug(`Error al guardar en Redis (key: ${key}):`, error instanceof Error ? error.message : String(error));
      }
      // No lanzar error, solo fallar silenciosamente
    }
  }

  /**
   * Obtiene un valor de Redis.
   *
   * @param key - Clave
   * @returns Valor o null si no existe
   */
  async get(key: string): Promise<string | null> {
    if (!this.isRedisAvailable) {
      // Retornar null silenciosamente si Redis no está disponible
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      // No loguear errores si Redis no está disponible
      if (this.isRedisAvailable) {
        this.logger.debug(`Error al leer de Redis (key: ${key}):`, error instanceof Error ? error.message : String(error));
      }
      return null;
    }
  }

  /**
   * Elimina una clave de Redis.
   *
   * @param key - Clave a eliminar
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error al eliminar de Redis (key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Verifica si Redis está conectado.
   *
   * @returns true si está conectado
   */
  isConnected(): boolean {
    return this.isRedisAvailable && this.client?.status === 'ready';
  }

  /**
   * Obtiene el cliente Redis (para operaciones avanzadas).
   */
  getClient(): Redis {
    return this.client;
  }
}

