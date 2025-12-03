import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderTelegramDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private menuService: MenuService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, deliveryFee: number = 10) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: createOrderDto.clienteId },
      include: { usuario: true },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${createOrderDto.clienteId} no encontrado`);
    }

    // Verificar conductor si se especifica
    if (createOrderDto.conductorId) {
      const conductor = await this.prisma.conductor.findUnique({
        where: { id: createOrderDto.conductorId },
      });
      if (!conductor) {
        throw new NotFoundException(`Conductor con ID ${createOrderDto.conductorId} no encontrado`);
      }
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of createOrderDto.items) {
      const product = await this.menuService.findProductById(item.productId);
      
      if (!product.isAvailable) {
        throw new BadRequestException(`Producto ${product.name} no está disponible`);
      }

      if (item.sideDishIds && item.sideDishIds.length > 0) {
        if (product.sideDishCount > 0 && item.sideDishIds.length > product.sideDishCount) {
          throw new BadRequestException(
            `Producto ${product.name} permite máximo ${product.sideDishCount} guarniciones`,
          );
        }
        await this.menuService.validateSideDishes(item.sideDishIds);
      }

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        sideDishes: item.sideDishIds?.map((sideDishId) => ({
          sideDishId,
        })) || [],
      });
    }

    const total = subtotal + deliveryFee;

    // Por defecto, crear pedido en estado READY_FOR_PICKUP
    const orderStatus = OrderStatus.READY_FOR_PICKUP;

    const createdOrder = await this.prisma.order.create({
      data: {
        clienteId: createOrderDto.clienteId,
        conductorId: createOrderDto.conductorId,
        status: orderStatus,
        paymentMethod: createOrderDto.paymentMethod,
        total,
        address: createOrderDto.address || cliente.direccion,
        latitude: createOrderDto.latitude || cliente.latitud,
        longitude: createOrderDto.longitude || cliente.longitud,
        notes: createOrderDto.notes,
        items: {
          create: orderItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            sideDishes: {
              create: item.sideDishes,
            },
          })),
        },
      },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
      },
    });

    // Emitir evento si el pedido se creó en estado READY_FOR_PICKUP
    if (orderStatus === OrderStatus.READY_FOR_PICKUP) {
      this.eventEmitter.emit('order.ready_for_pickup', createdOrder.id);
    }

    return createdOrder;
  }

  async createOrderByTelegramId(createOrderDto: CreateOrderTelegramDto, deliveryFee: number = 10) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { telegramId: createOrderDto.telegramId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con Telegram ID ${createOrderDto.telegramId} no encontrado`);
    }

    // Convertir a CreateOrderDto y llamar al método principal
    const orderDto: CreateOrderDto = {
      clienteId: cliente.id,
      paymentMethod: createOrderDto.paymentMethod,
      address: createOrderDto.address,
      latitude: createOrderDto.latitude,
      longitude: createOrderDto.longitude,
      notes: createOrderDto.notes,
      items: createOrderDto.items,
    };

    return this.createOrder(orderDto, deliveryFee);
  }

  async findAllOrders() {
    return this.prisma.order.findMany({
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
        deliveryStop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
        deliveryStop: {
          include: {
            batch: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    return order;
  }

  async findOrdersByClienteId(clienteId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    return this.prisma.order.findMany({
      where: { clienteId },
      include: {
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
        deliveryStop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOrdersByTelegramId(telegramId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { telegramId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con Telegram ID ${telegramId} no encontrado`);
    }

    return this.findOrdersByClienteId(cliente.id);
  }

  async findOrdersByConductorId(conductorId: number) {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
    });

    if (!conductor) {
      throw new NotFoundException(`Conductor con ID ${conductorId} no encontrado`);
    }

    return this.prisma.order.findMany({
      where: { conductorId },
      include: {
        cliente: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
        deliveryStop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOrdersByStatus(status: OrderStatus) {
    return this.prisma.order.findMany({
      where: { status },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPendingOrdersForAssignment() {
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        conductorId: null,
      },
      include: {
        cliente: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
    await this.findOrderById(id);

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderStatus(id: number, status: OrderStatus) {
    const order = await this.findOrderById(id);

    if (order.status === OrderStatus.DELIVERED && status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('No se puede cambiar el estado de una orden entregada');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se puede cambiar el estado de una orden cancelada');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
      },
    });

    // Emitir evento si el pedido cambió a READY_FOR_PICKUP
    if (status === OrderStatus.READY_FOR_PICKUP && order.status !== OrderStatus.READY_FOR_PICKUP) {
      this.eventEmitter.emit('order.ready_for_pickup', id);
    }

    return updatedOrder;
  }

  async assignConductor(orderId: number, conductorId: number) {
    const order = await this.findOrderById(orderId);
    
    if (order.conductorId) {
      throw new BadRequestException('La orden ya tiene un conductor asignado');
    }

    const conductor = await this.prisma.conductor.findUnique({
      where: { id: conductorId },
    });

    if (!conductor) {
      throw new NotFoundException(`Conductor con ID ${conductorId} no encontrado`);
    }

    if (conductor.estado !== 'DISPONIBLE') {
      throw new BadRequestException('El conductor no está disponible');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        conductorId,
        status: OrderStatus.EN_CAMINO,
      },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async cancelOrder(id: number) {
    const order = await this.findOrderById(id);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('No se puede cancelar una orden entregada');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('La orden ya está cancelada');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        cliente: {
          include: { usuario: true },
        },
        conductor: {
          include: { usuario: true },
        },
        items: {
          include: {
            product: true,
            sideDishes: {
              include: {
                sideDish: true,
              },
            },
          },
        },
      },
    });
  }

  async removeOrder(id: number) {
    await this.findOrderById(id);
    return this.prisma.order.delete({
      where: { id },
    });
  }

  // ==================== MÉTODOS LEGACY (compatibilidad) ====================

  async findOrdersByUserId(userId: number) {
    return this.findOrdersByClienteId(userId);
  }
}
