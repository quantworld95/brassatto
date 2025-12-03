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
    const existingUsuario = await prisma.usuario.findUnique({ where: { ci: admin.ci } });
    if (!existingUsuario) {
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
  }
  console.log('  ✅ 2 Administrators created');

  // ==================== CONDUCTORES (20) ====================
  console.log('  🚗 Creating drivers...');

  const conductorData = [
    { nombre: 'Juan Pérez', ci: '2000001', telefono: '+591 71000001', email: 'juan.perez@delivery.com', placa: 'ABC-001' },
    { nombre: 'María García', ci: '2000002', telefono: '+591 71000002', email: 'maria.garcia@delivery.com', placa: 'ABC-002' },
    { nombre: 'Carlos López', ci: '2000003', telefono: '+591 71000003', email: 'carlos.lopez@delivery.com', placa: 'ABC-003' },
    { nombre: 'Ana Rodríguez', ci: '2000004', telefono: '+591 71000004', email: 'ana.rodriguez@delivery.com', placa: 'ABC-004' },
    { nombre: 'Pedro Martínez', ci: '2000005', telefono: '+591 71000005', email: 'pedro.martinez@delivery.com', placa: 'ABC-005' },
    { nombre: 'Laura Sánchez', ci: '2000006', telefono: '+591 71000006', email: 'laura.sanchez@delivery.com', placa: 'ABC-006' },
    { nombre: 'Diego Flores', ci: '2000007', telefono: '+591 71000007', email: 'diego.flores@delivery.com', placa: 'ABC-007' },
    { nombre: 'Carmen Vargas', ci: '2000008', telefono: '+591 71000008', email: 'carmen.vargas@delivery.com', placa: 'ABC-008' },
    { nombre: 'Roberto Mendoza', ci: '2000009', telefono: '+591 71000009', email: 'roberto.mendoza@delivery.com', placa: 'ABC-009' },
    { nombre: 'Patricia Romero', ci: '2000010', telefono: '+591 71000010', email: 'patricia.romero@delivery.com', placa: 'ABC-010' },
    { nombre: 'Fernando Torres', ci: '2000011', telefono: '+591 71000011', email: 'fernando.torres@delivery.com', placa: 'ABC-011' },
    { nombre: 'Lucía Herrera', ci: '2000012', telefono: '+591 71000012', email: 'lucia.herrera@delivery.com', placa: 'ABC-012' },
    { nombre: 'Miguel Castillo', ci: '2000013', telefono: '+591 71000013', email: 'miguel.castillo@delivery.com', placa: 'ABC-013' },
    { nombre: 'Rosa Jiménez', ci: '2000014', telefono: '+591 71000014', email: 'rosa.jimenez@delivery.com', placa: 'ABC-014' },
    { nombre: 'Andrés Morales', ci: '2000015', telefono: '+591 71000015', email: 'andres.morales@delivery.com', placa: 'ABC-015' },
    { nombre: 'Elena Guzmán', ci: '2000016', telefono: '+591 71000016', email: 'elena.guzman@delivery.com', placa: 'ABC-016' },
    { nombre: 'Jorge Ríos', ci: '2000017', telefono: '+591 71000017', email: 'jorge.rios@delivery.com', placa: 'ABC-017' },
    { nombre: 'Sofía Delgado', ci: '2000018', telefono: '+591 71000018', email: 'sofia.delgado@delivery.com', placa: 'ABC-018' },
    { nombre: 'Raúl Paredes', ci: '2000019', telefono: '+591 71000019', email: 'raul.paredes@delivery.com', placa: 'ABC-019' },
    { nombre: 'Mónica Salazar', ci: '2000020', telefono: '+591 71000020', email: 'monica.salazar@delivery.com', placa: 'ABC-020' },
  ];

  // Coordenadas base: Plaza 24 de Septiembre
  const restaurantLat = -17.7833;
  const restaurantLon = -63.1821;

  // Coordenadas estratégicas para conductores
  // Algunos cerca del restaurante (< 3km), otros lejos (> 3km)
  const conductorCoordinates = [
    // CERCA del restaurante (dentro de 3 km)
    { lat: restaurantLat - 0.005, lon: restaurantLon + 0.003 },  // ~0.6 km
    { lat: restaurantLat + 0.008, lon: restaurantLon - 0.004 },  // ~1.0 km
    { lat: restaurantLat - 0.010, lon: restaurantLon + 0.010 },  // ~1.5 km
    { lat: restaurantLat + 0.015, lon: restaurantLon - 0.008 },  // ~1.9 km
    { lat: restaurantLat - 0.020, lon: restaurantLon + 0.012 },  // ~2.5 km
    { lat: restaurantLat + 0.018, lon: restaurantLon + 0.015 },  // ~2.4 km
    
    // LEJOS del restaurante (> 3 km)
    { lat: restaurantLat - 0.035, lon: restaurantLon - 0.025 },  // ~4.5 km
    { lat: restaurantLat + 0.040, lon: restaurantLon + 0.030 },  // ~5.2 km
    { lat: restaurantLat - 0.050, lon: restaurantLon + 0.040 },  // ~6.8 km
    { lat: restaurantLat + 0.055, lon: restaurantLon - 0.045 },  // ~7.5 km
    
    // MUY CERCA (casi en la plaza)
    { lat: restaurantLat + 0.002, lon: restaurantLon - 0.001 },  // ~0.2 km
    { lat: restaurantLat - 0.003, lon: restaurantLon + 0.002 },  // ~0.4 km
    
    // DISTANCIA MEDIA (alrededor de 3 km, en el límite)
    { lat: restaurantLat + 0.025, lon: restaurantLon + 0.020 },  // ~3.2 km
    { lat: restaurantLat - 0.028, lon: restaurantLon - 0.018 },  // ~3.4 km
    
    // Resto aleatorio pero dentro del área urbana
    { lat: restaurantLat + 0.012, lon: restaurantLon + 0.008 },
    { lat: restaurantLat - 0.015, lon: restaurantLon - 0.010 },
    { lat: restaurantLat + 0.022, lon: restaurantLon - 0.015 },
    { lat: restaurantLat - 0.018, lon: restaurantLon + 0.020 },
    { lat: restaurantLat + 0.030, lon: restaurantLon + 0.025 },
    { lat: restaurantLat - 0.032, lon: restaurantLon - 0.022 },
  ];

  const estados = [ConductorEstado.DISPONIBLE, ConductorEstado.OCUPADO, ConductorEstado.DESCONECTADO];
  
  for (let i = 0; i < conductorData.length; i++) {
    const conductor = conductorData[i];
    const existingUsuario = await prisma.usuario.findUnique({ where: { ci: conductor.ci } });
    if (!existingUsuario) {
      const coords = conductorCoordinates[i];

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
              latitudActual: coords.lat,
              longitudActual: coords.lon,
              estado: estados[i % 3], // Rotar entre estados
            },
          },
        },
      });
    }
  }
  console.log('  ✅ 20 Drivers created');

  // ==================== CLIENTES (5) ====================
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

  // Coordenadas específicas para clientes (distribuidos por Santa Cruz)
  const clienteCoordinates = [
    { lat: restaurantLat - 0.015, lon: restaurantLon + 0.010 },  // Cliente 1
    { lat: restaurantLat + 0.020, lon: restaurantLon - 0.015 },  // Cliente 2
    { lat: restaurantLat - 0.008, lon: restaurantLon + 0.025 },  // Cliente 3
    { lat: restaurantLat + 0.030, lon: restaurantLon + 0.020 },  // Cliente 4
    { lat: restaurantLat - 0.025, lon: restaurantLon - 0.018 },  // Cliente 5
    { lat: restaurantLat + 0.012, lon: restaurantLon + 0.008 },  // Cliente 6
    { lat: restaurantLat - 0.035, lon: restaurantLon + 0.030 },  // Cliente 7
    { lat: restaurantLat + 0.040, lon: restaurantLon - 0.025 },  // Cliente 8
    { lat: restaurantLat - 0.018, lon: restaurantLon - 0.012 },  // Cliente 9
  ];

  for (let i = 0; i < clienteData.length; i++) {
    const cliente = clienteData[i];
    const existingUsuario = await prisma.usuario.findUnique({ where: { ci: cliente.ci } });
    if (!existingUsuario) {
      const coords = clienteCoordinates[i];

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
              latitud: coords.lat,
              longitud: coords.lon,
            },
          },
        },
      });
    }
  }
  console.log('  ✅ 9 Clients created');
}

