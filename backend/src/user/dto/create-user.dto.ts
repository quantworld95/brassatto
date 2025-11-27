import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  phone?: string;

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
}

