import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

class CreateOrderItemDto {
  @ApiProperty({ description: 'ID del producto', example: 1 })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: 'Cantidad del producto', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'IDs de acompañamientos', example: [1, 2, 3], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  sideDishIds?: number[];
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del cliente', example: 1 })
  @IsInt()
  @Type(() => Number)
  clienteId: number;

  @ApiPropertyOptional({ description: 'ID del conductor asignado (opcional)', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  conductorId?: number;

  @ApiPropertyOptional({ description: 'Método de pago', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Dirección de entrega', example: 'Av. Arce #2631, Zona San Jorge, La Paz' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Latitud de la ubicación de entrega', example: -16.5000 })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud de la ubicación de entrega', example: -68.1500 })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales para la orden', example: 'Sin cebolla' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Items de la orden', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

// DTO para crear orden desde Telegram (usando telegramId en lugar de clienteId)
export class CreateOrderTelegramDto {
  @ApiProperty({ description: 'Telegram ID del cliente', example: '123456789' })
  @IsString()
  telegramId: string;

  @ApiPropertyOptional({ description: 'Método de pago', enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Dirección de entrega', example: 'Av. Arce #2631, Zona San Jorge, La Paz' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Latitud de la ubicación de entrega', example: -16.5000 })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitud de la ubicación de entrega', example: -68.1500 })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales para la orden', example: 'Sin cebolla' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Items de la orden', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
