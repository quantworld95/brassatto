import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateUsuarioDto,
  CreateClienteDto,
  CreateConductorDto,
  CreateAdministradorDto,
  CreateClienteTelegramDto,
  ConductorEstadoEnum,
} from './create-user.dto';

// DTO para actualizar Usuario base
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}

// DTO para actualizar Cliente
export class UpdateClienteDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  ci?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  usernameTelegram?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  latitud?: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  longitud?: number;
}

// DTO para actualizar Conductor
export class UpdateConductorDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  ci?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  placa?: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  latitudActual?: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @IsOptional()
  @Type(() => Number)
  longitudActual?: number;

  @IsEnum(ConductorEstadoEnum)
  @IsOptional()
  estado?: ConductorEstadoEnum;
}

// DTO para actualizar Administrador
export class UpdateAdministradorDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  ci?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  cargo?: string;

  @IsBoolean()
  @IsOptional()
  esSuperAdmin?: boolean;
}

// Mantener compatibilidad con código existente
export class UpdateUserDto extends PartialType(CreateClienteTelegramDto) {}
