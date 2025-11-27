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
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva orden' })
  @ApiResponse({ status: 201, description: 'Orden creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o producto no disponible' })
  @ApiResponse({ status: 404, description: 'Usuario o producto no encontrado' })
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las órdenes' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes' })
  findAllOrders() {
    return this.orderService.findAllOrders();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener órdenes de un usuario por ID' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOrdersByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.orderService.findOrdersByUserId(userId);
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Obtener órdenes de un usuario por Telegram ID' })
  @ApiParam({ name: 'telegramId', description: 'ID de Telegram del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOrdersByTelegramId(@Param('telegramId') telegramId: string) {
    return this.orderService.findOrdersByTelegramId(telegramId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Obtener órdenes por estado' })
  @ApiParam({ name: 'status', enum: OrderStatus, description: 'Estado de la orden' })
  @ApiResponse({ status: 200, description: 'Lista de órdenes con el estado especificado' })
  findOrdersByStatus(@Param('status') status: OrderStatus) {
    return this.orderService.findOrdersByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  findOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOrderById(id);
  }

  @Patch(':id')
  updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.updateOrder(id, updateOrderDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de la orden' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede cambiar el estado' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ) {
    return this.orderService.updateOrderStatus(id, status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Orden cancelada exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede cancelar la orden' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.cancelOrder(id);
  }

  @Delete(':id')
  removeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.removeOrder(id);
  }
}

