import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

