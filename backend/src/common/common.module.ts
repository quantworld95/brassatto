import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Módulo común con servicios compartidos.
 * Marcado como @Global para que esté disponible en toda la app.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}

