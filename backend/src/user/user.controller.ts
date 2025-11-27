import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAllUsers() {
    return this.userService.findAllUsers();
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Obtener usuario por Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'ID de Telegram del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findUserByTelegramId(@Param('telegramId') telegramId: string) {
    return this.userService.findUserByTelegramId(telegramId);
  }

  @Post('telegram/:telegramId')
  createOrFindByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() userData?: Partial<CreateUserDto>,
  ) {
    return this.userService.createOrFindByTelegramId(telegramId, userData);
  }

  @Get(':id')
  findUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserById(id);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('telegram/:telegramId')
  updateUserByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUserByTelegramId(telegramId, updateUserDto);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación del usuario por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.userService.updateLocation(
      id,
      updateLocationDto.address,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    );
  }

  @Patch('telegram/:telegramId/location')
  @ApiOperation({ summary: 'Actualizar ubicación del usuario por Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'ID de Telegram del usuario' })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  updateLocationByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.userService.updateLocationByTelegramId(
      telegramId,
      updateLocationDto.address,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    );
  }

  @Delete(':id')
  removeUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.removeUser(id);
  }
}

