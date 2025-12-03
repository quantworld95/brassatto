import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO base para Usuario
export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;
}

// DTO para crear Cliente
export class CreateClienteDto extends CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

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

// DTO para crear Cliente desde Telegram (datos mínimos)
export class CreateClienteTelegramDto {
  @IsString()
  @IsNotEmpty()
  telegramId: string;

  @IsString()
  @IsOptional()
  usernameTelegram?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}

// Enum para el estado del conductor
export enum ConductorEstadoEnum {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADO = 'OCUPADO',
  DESCONECTADO = 'DESCONECTADO',
}

// DTO para crear Conductor
export class CreateConductorDto extends CreateUsuarioDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  placa: string;

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

// DTO para crear Administrador
export class CreateAdministradorDto extends CreateUsuarioDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  cargo: string;

  @IsBoolean()
  @IsOptional()
  esSuperAdmin?: boolean;
}

// Mantener compatibilidad con código existente (alias para Cliente)
export class CreateUserDto extends CreateClienteTelegramDto {}
