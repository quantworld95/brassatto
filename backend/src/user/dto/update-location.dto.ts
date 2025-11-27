import {
  IsString,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Type(() => Number)
  latitude: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Type(() => Number)
  longitude: number;
}

