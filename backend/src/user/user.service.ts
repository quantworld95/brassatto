import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // ==================== CLIENTES ====================

  async createCliente(createClienteDto: CreateClienteDto) {
    const { nombre, ci, telefono, telegramId, usernameTelegram, direccion, latitud, longitud } = createClienteDto;

    // Verificar si ya existe el CI o telegramId
    const existingUsuario = await this.prisma.usuario.findUnique({ where: { ci } });
    if (existingUsuario) {
      throw new ConflictException(`Usuario con CI ${ci} ya existe`);
    }

    const existingTelegram = await this.prisma.cliente.findUnique({ where: { telegramId } });
    if (existingTelegram) {
      throw new ConflictException(`Cliente con Telegram ID ${telegramId} ya existe`);
    }

    return this.prisma.usuario.create({
      data: {
        nombre,
        ci,
        telefono,
        cliente: {
          create: {
            telegramId,
            usernameTelegram,
            direccion,
            latitud,
            longitud,
          },
        },
      },
      include: {
        cliente: true,
      },
    });
  }

  async createOrFindByTelegramId(telegramId: string, userData?: Partial<CreateClienteTelegramDto>) {
    const existingCliente = await this.prisma.cliente.findUnique({
      where: { telegramId },
      include: {
        usuario: true,
        orders: true,
      },
    });

    if (existingCliente) {
      return existingCliente;
    }

    // Crear nuevo usuario y cliente con datos mínimos
    const nombre = userData?.nombre || 'Cliente Telegram';
    const telefono = userData?.telefono || '';
    const ci = `TG-${telegramId}`; // CI temporal basado en Telegram ID

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre,
        ci,
        telefono,
        cliente: {
          create: {
            telegramId,
            usernameTelegram: userData?.usernameTelegram,
          },
        },
      },
      include: {
        cliente: {
          include: {
            orders: true,
          },
        },
      },
    });

    return usuario.cliente;
  }

  async findAllClientes() {
    return this.prisma.cliente.findMany({
      include: {
        usuario: true,
        orders: true,
      },
    });
  }

  async findClienteById(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        usuario: true,
        orders: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  async findClienteByTelegramId(telegramId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { telegramId },
      include: {
        usuario: true,
        orders: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con Telegram ID ${telegramId} no encontrado`);
    }

    return cliente;
  }

  async updateCliente(id: number, updateClienteDto: UpdateClienteDto) {
    const cliente = await this.findClienteById(id);
    const { nombre, ci, telefono, ...clienteData } = updateClienteDto;

    // Actualizar datos del usuario base si se proporcionan
    if (nombre || ci || telefono) {
      await this.prisma.usuario.update({
        where: { id: cliente.usuarioId },
        data: {
          ...(nombre && { nombre }),
          ...(ci && { ci }),
          ...(telefono && { telefono }),
        },
      });
    }

    // Actualizar datos del cliente
    return this.prisma.cliente.update({
      where: { id },
      data: clienteData,
      include: {
        usuario: true,
      },
    });
  }

  async updateClienteByTelegramId(telegramId: string, updateClienteDto: UpdateClienteDto) {
    const cliente = await this.findClienteByTelegramId(telegramId);
    return this.updateCliente(cliente.id, updateClienteDto);
  }

  async updateClienteLocation(id: number, direccion: string, latitud: number, longitud: number) {
    await this.findClienteById(id);
    return this.prisma.cliente.update({
      where: { id },
      data: {
        direccion,
        latitud,
        longitud,
      },
      include: {
        usuario: true,
      },
    });
  }

  async updateClienteLocationByTelegramId(
    telegramId: string,
    direccion: string,
    latitud: number,
    longitud: number,
  ) {
    const cliente = await this.findClienteByTelegramId(telegramId);
    return this.updateClienteLocation(cliente.id, direccion, latitud, longitud);
  }

  async removeCliente(id: number) {
    const cliente = await this.findClienteById(id);
    // Al eliminar el usuario, se elimina en cascada el cliente
    return this.prisma.usuario.delete({
      where: { id: cliente.usuarioId },
    });
  }

  // ==================== CONDUCTORES ====================

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async createConductor(createConductorDto: CreateConductorDto) {
    const { nombre, ci, telefono, email, password, placa, latitudActual, longitudActual, estado } = createConductorDto;

    // Verificar si ya existe el CI o email
    const existingUsuario = await this.prisma.usuario.findUnique({ where: { ci } });
    if (existingUsuario) {
      throw new ConflictException(`Usuario con CI ${ci} ya existe`);
    }

    const existingEmail = await this.prisma.conductor.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException(`Conductor con email ${email} ya existe`);
    }

    const passwordHash = await this.hashPassword(password);

    return this.prisma.usuario.create({
      data: {
        nombre,
        ci,
        telefono,
        conductor: {
          create: {
            email,
            passwordHash,
            placa,
            latitudActual,
            longitudActual,
            estado,
          },
        },
      },
      include: {
        conductor: true,
      },
    });
  }

  async findAllConductores() {
    return this.prisma.conductor.findMany({
      include: {
        usuario: true,
        orders: true,
        deliveryBatches: true,
      },
    });
  }

  async findConductorById(id: number) {
    const conductor = await this.prisma.conductor.findUnique({
      where: { id },
      include: {
        usuario: true,
        orders: true,
        deliveryBatches: {
          include: {
            stops: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    if (!conductor) {
      throw new NotFoundException(`Conductor con ID ${id} no encontrado`);
    }

    return conductor;
  }

  async findConductorByEmail(email: string) {
    const conductor = await this.prisma.conductor.findUnique({
      where: { email },
      include: {
        usuario: true,
      },
    });

    if (!conductor) {
      throw new NotFoundException(`Conductor con email ${email} no encontrado`);
    }

    return conductor;
  }

  async updateConductor(id: number, updateConductorDto: UpdateConductorDto) {
    const conductor = await this.findConductorById(id);
    const { nombre, ci, telefono, password, ...conductorData } = updateConductorDto;

    // Actualizar datos del usuario base si se proporcionan
    if (nombre || ci || telefono) {
      await this.prisma.usuario.update({
        where: { id: conductor.usuarioId },
        data: {
          ...(nombre && { nombre }),
          ...(ci && { ci }),
          ...(telefono && { telefono }),
        },
      });
    }

    // Si hay nueva contraseña, hashearla
    const dataToUpdate: any = { ...conductorData };
    if (password) {
      dataToUpdate.passwordHash = await this.hashPassword(password);
    }

    return this.prisma.conductor.update({
      where: { id },
      data: dataToUpdate,
      include: {
        usuario: true,
      },
    });
  }

  async updateConductorLocation(id: number, latitudActual: number, longitudActual: number) {
    await this.findConductorById(id);
    return this.prisma.conductor.update({
      where: { id },
      data: {
        latitudActual,
        longitudActual,
      },
    });
  }

  async updateConductorEstado(id: number, estado: string) {
    await this.findConductorById(id);
    return this.prisma.conductor.update({
      where: { id },
      data: {
        estado: estado as any,
      },
      include: {
        usuario: true,
      },
    });
  }

  async findConductoresDisponibles() {
    return this.prisma.conductor.findMany({
      where: {
        estado: 'DISPONIBLE',
      },
      include: {
        usuario: true,
      },
    });
  }

  async removeConductor(id: number) {
    const conductor = await this.findConductorById(id);
    return this.prisma.usuario.delete({
      where: { id: conductor.usuarioId },
    });
  }

  // ==================== ADMINISTRADORES ====================

  async createAdministrador(createAdministradorDto: CreateAdministradorDto) {
    const { nombre, ci, telefono, email, password, cargo, esSuperAdmin } = createAdministradorDto;

    // Verificar si ya existe el CI o email
    const existingUsuario = await this.prisma.usuario.findUnique({ where: { ci } });
    if (existingUsuario) {
      throw new ConflictException(`Usuario con CI ${ci} ya existe`);
    }

    const existingEmail = await this.prisma.administrador.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException(`Administrador con email ${email} ya existe`);
    }

    const passwordHash = await this.hashPassword(password);

    return this.prisma.usuario.create({
      data: {
        nombre,
        ci,
        telefono,
        administrador: {
          create: {
            email,
            passwordHash,
            cargo,
            esSuperAdmin: esSuperAdmin ?? false,
          },
        },
      },
      include: {
        administrador: true,
      },
    });
  }

  async findAllAdministradores() {
    return this.prisma.administrador.findMany({
      include: {
        usuario: true,
      },
    });
  }

  async findAdministradorById(id: number) {
    const administrador = await this.prisma.administrador.findUnique({
      where: { id },
      include: {
        usuario: true,
      },
    });

    if (!administrador) {
      throw new NotFoundException(`Administrador con ID ${id} no encontrado`);
    }

    return administrador;
  }

  async findAdministradorByEmail(email: string) {
    const administrador = await this.prisma.administrador.findUnique({
      where: { email },
      include: {
        usuario: true,
      },
    });

    if (!administrador) {
      throw new NotFoundException(`Administrador con email ${email} no encontrado`);
    }

    return administrador;
  }

  async updateAdministrador(id: number, updateAdministradorDto: UpdateAdministradorDto) {
    const administrador = await this.findAdministradorById(id);
    const { nombre, ci, telefono, password, ...administradorData } = updateAdministradorDto;

    // Actualizar datos del usuario base si se proporcionan
    if (nombre || ci || telefono) {
      await this.prisma.usuario.update({
        where: { id: administrador.usuarioId },
        data: {
          ...(nombre && { nombre }),
          ...(ci && { ci }),
          ...(telefono && { telefono }),
        },
      });
    }

    // Si hay nueva contraseña, hashearla
    const dataToUpdate: any = { ...administradorData };
    if (password) {
      dataToUpdate.passwordHash = await this.hashPassword(password);
    }

    return this.prisma.administrador.update({
      where: { id },
      data: dataToUpdate,
      include: {
        usuario: true,
      },
    });
  }

  async removeAdministrador(id: number) {
    const administrador = await this.findAdministradorById(id);
    return this.prisma.usuario.delete({
      where: { id: administrador.usuarioId },
    });
  }

  // ==================== MÉTODOS LEGACY (compatibilidad) ====================
  // Estos métodos mantienen compatibilidad con el código existente del bot de Telegram

  async createUser(createUserDto: any) {
    return this.createOrFindByTelegramId(createUserDto.telegramId, createUserDto);
  }

  async findAllUsers() {
    return this.findAllClientes();
  }

  async findUserById(id: number) {
    return this.findClienteById(id);
  }

  async findUserByTelegramId(telegramId: string) {
    return this.findClienteByTelegramId(telegramId);
  }

  async updateUser(id: number, updateUserDto: any) {
    return this.updateCliente(id, updateUserDto);
  }

  async updateUserByTelegramId(telegramId: string, updateUserDto: any) {
    return this.updateClienteByTelegramId(telegramId, updateUserDto);
  }

  async updateLocation(id: number, address: string, latitude: number, longitude: number) {
    return this.updateClienteLocation(id, address, latitude, longitude);
  }

  async updateLocationByTelegramId(
    telegramId: string,
    address: string,
    latitude: number,
    longitude: number,
  ) {
    return this.updateClienteLocationByTelegramId(telegramId, address, latitude, longitude);
  }

  async removeUser(id: number) {
    return this.removeCliente(id);
  }
}
