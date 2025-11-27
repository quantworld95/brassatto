import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async createOrFindByTelegramId(telegramId: string, userData?: Partial<CreateUserDto>) {
    const existingUser = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.prisma.user.create({
      data: {
        telegramId,
        ...userData,
      },
    });
  }

  async findAllUsers() {
    return this.prisma.user.findMany({
      include: {
        orders: true,
      },
    });
  }

  async findUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findUserByTelegramId(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      include: {
        orders: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with Telegram ID ${telegramId} not found`);
    }

    return user;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    await this.findUserById(id);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async updateUserByTelegramId(telegramId: string, updateUserDto: UpdateUserDto) {
    const user = await this.findUserByTelegramId(telegramId);
    return this.prisma.user.update({
      where: { telegramId },
      data: updateUserDto,
    });
  }

  async updateLocation(
    id: number,
    address: string,
    latitude: number,
    longitude: number,
  ) {
    await this.findUserById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        address,
        latitude,
        longitude,
      },
    });
  }

  async updateLocationByTelegramId(
    telegramId: string,
    address: string,
    latitude: number,
    longitude: number,
  ) {
    await this.findUserByTelegramId(telegramId);
    return this.prisma.user.update({
      where: { telegramId },
      data: {
        address,
        latitude,
        longitude,
      },
    });
  }

  async removeUser(id: number) {
    await this.findUserById(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}

