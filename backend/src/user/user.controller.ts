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
import {
  CreateClienteDto,
  CreateConductorDto,
  CreateAdministradorDto,
  CreateClienteTelegramDto,
} from './dto/create-user.dto';
import {
  UpdateClienteDto,
  UpdateConductorDto,
  UpdateAdministradorDto,
} from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

// ==================== CONTROLADOR DE CLIENTES ====================

@ApiTags('clientes')
@Controller('clientes')
export class ClienteController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Cliente ya existe' })
  createCliente(@Body() createClienteDto: CreateClienteDto) {
    return this.userService.createCliente(createClienteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  findAllClientes() {
    return this.userService.findAllClientes();
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Obtener cliente por Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'ID de Telegram del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findClienteByTelegramId(@Param('telegramId') telegramId: string) {
    return this.userService.findClienteByTelegramId(telegramId);
  }

  @Post('telegram/:telegramId')
  @ApiOperation({ summary: 'Crear o encontrar cliente por Telegram ID' })
  createOrFindByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() userData?: Partial<CreateClienteTelegramDto>,
  ) {
    return this.userService.createOrFindByTelegramId(telegramId, userData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del cliente' })
  findClienteById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findClienteById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  updateCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.userService.updateCliente(id, updateClienteDto);
  }

  @Patch('telegram/:telegramId')
  @ApiOperation({ summary: 'Actualizar cliente por Telegram ID' })
  updateClienteByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.userService.updateClienteByTelegramId(telegramId, updateClienteDto);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación del cliente por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.userService.updateClienteLocation(
      id,
      updateLocationDto.address,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    );
  }

  @Patch('telegram/:telegramId/location')
  @ApiOperation({ summary: 'Actualizar ubicación del cliente por Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'ID de Telegram del cliente' })
  @ApiResponse({ status: 200, description: 'Ubicación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  updateLocationByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.userService.updateClienteLocationByTelegramId(
      telegramId,
      updateLocationDto.address,
      updateLocationDto.latitude,
      updateLocationDto.longitude,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  removeCliente(@Param('id', ParseIntPipe) id: number) {
    return this.userService.removeCliente(id);
  }
}

// ==================== CONTROLADOR DE CONDUCTORES ====================

@ApiTags('conductores')
@Controller('conductores')
export class ConductorController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo conductor' })
  @ApiResponse({ status: 201, description: 'Conductor creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Conductor ya existe' })
  createConductor(@Body() createConductorDto: CreateConductorDto) {
    return this.userService.createConductor(createConductorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los conductores' })
  @ApiResponse({ status: 200, description: 'Lista de conductores' })
  findAllConductores() {
    return this.userService.findAllConductores();
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Listar conductores disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de conductores disponibles' })
  findConductoresDisponibles() {
    return this.userService.findConductoresDisponibles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener conductor por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del conductor' })
  findConductorById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findConductorById(id);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Obtener conductor por email' })
  @ApiParam({ name: 'email', description: 'Email del conductor' })
  findConductorByEmail(@Param('email') email: string) {
    return this.userService.findConductorByEmail(email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar conductor' })
  updateConductor(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConductorDto: UpdateConductorDto,
  ) {
    return this.userService.updateConductor(id, updateConductorDto);
  }

  @Patch(':id/location')
  @ApiOperation({ summary: 'Actualizar ubicación del conductor' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del conductor' })
  updateConductorLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() locationDto: { latitudActual: number; longitudActual: number },
  ) {
    return this.userService.updateConductorLocation(
      id,
      locationDto.latitudActual,
      locationDto.longitudActual,
    );
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado del conductor' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del conductor' })
  updateConductorEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() estadoDto: { estado: string },
  ) {
    return this.userService.updateConductorEstado(id, estadoDto.estado);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar conductor' })
  removeConductor(@Param('id', ParseIntPipe) id: number) {
    return this.userService.removeConductor(id);
  }
}

// ==================== CONTROLADOR DE ADMINISTRADORES ====================

@ApiTags('administradores')
@Controller('administradores')
export class AdministradorController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo administrador' })
  @ApiResponse({ status: 201, description: 'Administrador creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Administrador ya existe' })
  createAdministrador(@Body() createAdministradorDto: CreateAdministradorDto) {
    return this.userService.createAdministrador(createAdministradorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los administradores' })
  @ApiResponse({ status: 200, description: 'Lista de administradores' })
  findAllAdministradores() {
    return this.userService.findAllAdministradores();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener administrador por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del administrador' })
  findAdministradorById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findAdministradorById(id);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Obtener administrador por email' })
  @ApiParam({ name: 'email', description: 'Email del administrador' })
  findAdministradorByEmail(@Param('email') email: string) {
    return this.userService.findAdministradorByEmail(email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar administrador' })
  updateAdministrador(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdministradorDto: UpdateAdministradorDto,
  ) {
    return this.userService.updateAdministrador(id, updateAdministradorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar administrador' })
  removeAdministrador(@Param('id', ParseIntPipe) id: number) {
    return this.userService.removeAdministrador(id);
  }
}

// ==================== CONTROLADOR LEGACY (compatibilidad con bot Telegram) ====================

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario (legacy - usa clientes)' })
  createUser(@Body() createUserDto: CreateClienteTelegramDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios (legacy - usa clientes)' })
  findAllUsers() {
    return this.userService.findAllUsers();
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Obtener usuario por Telegram ID (legacy)' })
  findUserByTelegramId(@Param('telegramId') telegramId: string) {
    return this.userService.findUserByTelegramId(telegramId);
  }

  @Post('telegram/:telegramId')
  createOrFindByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() userData?: Partial<CreateClienteTelegramDto>,
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
    @Body() updateUserDto: UpdateClienteDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('telegram/:telegramId')
  updateUserByTelegramId(
    @Param('telegramId') telegramId: string,
    @Body() updateUserDto: UpdateClienteDto,
  ) {
    return this.userService.updateUserByTelegramId(telegramId, updateUserDto);
  }

  @Patch(':id/location')
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
