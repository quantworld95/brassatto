import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private menuService: MenuService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, deliveryFee: number = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: createOrderDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createOrderDto.userId} not found`);
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of createOrderDto.items) {
      const product = await this.menuService.findProductById(item.productId);
      
      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${product.name} is not available`);
      }

      if (item.sideDishIds && item.sideDishIds.length > 0) {
        if (product.sideDishCount > 0 && item.sideDishIds.length > product.sideDishCount) {
          throw new BadRequestException(
            `Product ${product.name} allows maximum ${product.sideDishCount} side dishes`,
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

    return this.prisma.order.create({
      data: {
        userId: createOrderDto.userId,
        status: OrderStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod,
        total,
        address: createOrderDto.address || user.address,
        latitude: createOrderDto.latitude || user.latitude,
        longitude: createOrderDto.longitude || user.longitude,
        notes: createOrderDto.notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        user: true,
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

  async findAllOrders() {
    return this.prisma.order.findMany({
      include: {
        user: true,
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

  async findOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
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

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findOrdersByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.order.findMany({
      where: { userId },
      include: {
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

  async findOrdersByTelegramId(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    return this.prisma.order.findMany({
      where: { userId: user.id },
      include: {
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

  async findOrdersByStatus(status: OrderStatus) {
    return this.prisma.order.findMany({
      where: { status },
      include: {
        user: true,
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

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
    await this.findOrderById(id);

    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        user: true,
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
      throw new BadRequestException('Cannot change status of a delivered order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot change status of a cancelled order');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: true,
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

  async cancelOrder(id: number) {
    const order = await this.findOrderById(id);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        user: true,
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
}

