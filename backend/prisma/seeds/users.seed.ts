import { PrismaClient, ConductorEstado } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Seeding users...');

  // ==================== ADMINISTRADORES (2) ====================
  console.log('  👤 Creating administrators...');

  const adminData = [
    { nombre: 'Admin Principal', ci: '1000001', telefono: '+591 70000001', email: 'admin@delivery.com', cargo: 'Gerente General', esSuperAdmin: true },
    { nombre: 'Admin Operaciones', ci: '1000002', telefono: '+591 70000002', email: 'operaciones@delivery.com', cargo: 'Jefe de Operaciones', esSuperAdmin: false },
  ];

  for (const admin of adminData) {
    await prisma.usuario.create({
      data: {
        nombre: admin.nombre,
        ci: admin.ci,
        telefono: admin.telefono,
        administrador: {
          create: {
            email: admin.email,
            passwordHash: await hashPassword('admin123'),
            cargo: admin.cargo,
            esSuperAdmin: admin.esSuperAdmin,
          },
        },
      },
    });
  }
  console.log('  ✅ 2 Administrators created');

  // ==================== CONDUCTORES (4) ====================
  console.log('  🚗 Creating drivers...');

  const conductorData = [
    { nombre: 'Juan Pérez', ci: '2000001', telefono: '+591 71000001', email: 'juan.perez@delivery.com', placa: 'ABC-001' },
    { nombre: 'María García', ci: '2000002', telefono: '+591 71000002', email: 'maria.garcia@delivery.com', placa: 'ABC-002' },
    { nombre: 'Carlos López', ci: '2000003', telefono: '+591 71000003', email: 'carlos.lopez@delivery.com', placa: 'ABC-003' },
    { nombre: 'Ana Rodríguez', ci: '2000004', telefono: '+591 71000004', email: 'ana.rodriguez@delivery.com', placa: 'ABC-004' },
  ];

  // Ubicación por defecto para todos los conductores
  const defaultLocation = {
    lat: -17.83231429,
    lon: -63.24613379,
  };

  // Todos los conductores empiezan DESCONECTADOS
  // El estado cambiará a DISPONIBLE cuando se conecten vía WebSocket
  // Todos tienen la misma ubicación por defecto
  for (const conductor of conductorData) {
    await prisma.usuario.create({
      data: {
        nombre: conductor.nombre,
        ci: conductor.ci,
        telefono: conductor.telefono,
        conductor: {
          create: {
            email: conductor.email,
            passwordHash: await hashPassword('conductor123'),
            placa: conductor.placa,
            latitudActual: defaultLocation.lat,
            longitudActual: defaultLocation.lon,
            estado: ConductorEstado.DESCONECTADO,
          },
        },
      },
    });
  }
  console.log('  ✅ 4 Drivers created (todos en estado DESCONECTADO)');

  // ==================== CLIENTES (9) ====================
  console.log('  🛒 Creating clients...');

  const clienteData = [
    { nombre: 'Cliente Uno', ci: '3000001', telefono: '+591 72000001', telegramId: '100000001', username: 'cliente_uno', direccion: 'Av. Monseñor Rivero #100' },
    { nombre: 'Cliente Dos', ci: '3000002', telefono: '+591 72000002', telegramId: '100000002', username: 'cliente_dos', direccion: 'Calle Sucre #200' },
    { nombre: 'Cliente Tres', ci: '3000003', telefono: '+591 72000003', telegramId: '100000003', username: 'cliente_tres', direccion: 'Av. San Martín #300' },
    { nombre: 'Cliente Cuatro', ci: '3000004', telefono: '+591 72000004', telegramId: '100000004', username: 'cliente_cuatro', direccion: 'Calle Junín #400' },
    { nombre: 'Cliente Cinco', ci: '3000005', telefono: '+591 72000005', telegramId: '100000005', username: 'cliente_cinco', direccion: 'Av. Cañoto #500' },
    { nombre: 'Cliente Seis', ci: '3000006', telefono: '+591 72000006', telegramId: '100000006', username: 'cliente_seis', direccion: 'Av. Banzer #600' },
    { nombre: 'Cliente Siete', ci: '3000007', telefono: '+591 72000007', telegramId: '100000007', username: 'cliente_siete', direccion: 'Av. Cristo Redentor #700' },
    { nombre: 'Cliente Ocho', ci: '3000008', telefono: '+591 72000008', telegramId: '100000008', username: 'cliente_ocho', direccion: 'Av. Pirai #800' },
    { nombre: 'Cliente Nueve', ci: '3000009', telefono: '+591 72000009', telegramId: '100000009', username: 'cliente_nueve', direccion: 'Av. Roca y Coronado #900' },
  ];

  // Los clientes NO tienen ubicación fija en el seed.
  // Cada pedido define su propia ubicación de entrega (en la tabla Order).
  for (const cliente of clienteData) {
    await prisma.usuario.create({
      data: {
        nombre: cliente.nombre,
        ci: cliente.ci,
        telefono: cliente.telefono,
        cliente: {
          create: {
            telegramId: cliente.telegramId,
            usernameTelegram: cliente.username,
            direccion: cliente.direccion,
            // latitud y longitud se dejan como null
            // La ubicación de entrega se define en cada pedido (Order)
          },
        },
      },
    });
  }
  console.log('  ✅ 9 Clients created (sin ubicación fija)');
}
