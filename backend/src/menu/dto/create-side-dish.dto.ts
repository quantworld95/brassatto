import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSideDishDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

