import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Bife Chorizo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del producto', example: 'Acompañado de 4 guarniciones a elegir.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Precio del producto', example: 85 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: 'Indica si es producto más vendido', example: true })
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiPropertyOptional({ description: 'Indica si el producto está disponible', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Cantidad máxima de acompañamientos permitidos', example: 4 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sideDishCount?: number;

  @ApiProperty({ description: 'ID de la categoría', example: 1 })
  @IsInt()
  @Type(() => Number)
  categoryId: number;
}

