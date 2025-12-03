/**
 * Script de prueba para FASE A + FASE B integradas
 * 
 * Ejecutar con: npx ts-node scripts/test-driver-selection.ts
 */

import { PrismaClient } from '@prisma/client';
import { ClusteringService } from '../src/assignment/clustering/clustering.service';
import { DriverSelectionService } from '../src/assignment/driver-selection/driver-selection.service';
import { RedisService } from '../src/common/redis.service';
import { DEFAULT_ASSIGNMENT_CONFIG, RestaurantInfo } from '../src/assignment/types/assignment.types';

const prisma = new PrismaClient();

// Crear instancias de servicios
const redisService = new RedisService();
redisService.onModuleInit(); // Inicializar Redis manualmente
const clusteringService = new ClusteringService(prisma as any);
const driverSelectionService = new DriverSelectionService(prisma as any, redisService);

// Coordenadas del restaurante - Plaza 24 de Septiembre, Santa Cruz
const RESTAURANT: RestaurantInfo = {
  name: 'Restaurante Plaza 24',
  address: 'Plaza 24 de Septiembre, Santa Cruz',
  coordinates: {
    latitude: -17.7833,
    longitude: -63.1821,
  },
};

async function main() {
  console.log('🧪 TEST: FASE A + FASE B\n');
  console.log('='.repeat(70));

  // ==================== FASE A ====================
  console.log('\n📦 FASE A: CLUSTERING DE PEDIDOS\n');
  
  const batches = await clusteringService.createBatches(DEFAULT_ASSIGNMENT_CONFIG);
  
  if (batches.length === 0) {
    console.log('   ⚠️  No hay batches. Ejecuta: npx prisma db seed');
    await prisma.$disconnect();
    return;
  }

  console.log(`   ✅ ${batches.length} batches generados:\n`);
  for (const batch of batches) {
    console.log(`   📦 Batch ${batch.tempId.slice(-8)}:`);
    console.log(`      - Pedidos: ${batch.orderIds.join(', ')}`);
    console.log(`      - Cantidad: ${batch.orders.length}`);
    console.log(`      - Distancia estimada: ${batch.estimatedDistanceKm.toFixed(2)} km\n`);
  }

  // ==================== FASE B ====================
  console.log('='.repeat(70));
  console.log('\n🚗 FASE B: SELECCIÓN DE CONDUCTORES\n');

  console.log(`   Restaurante: ${RESTAURANT.name}`);
  console.log(`   Ubicación: (${RESTAURANT.coordinates.latitude}, ${RESTAURANT.coordinates.longitude})\n`);

  // Obtener conductores disponibles
  const availableDrivers = await driverSelectionService.getAvailableDrivers();
  console.log(`   Conductores disponibles: ${availableDrivers.length}\n`);

  if (availableDrivers.length === 0) {
    console.log('   ⚠️  No hay conductores disponibles (todos están OCUPADOS o DESCONECTADOS)');
    await prisma.$disconnect();
    return;
  }

  // Mostrar algunos conductores
  console.log('   Conductores en sistema:');
  for (const driver of availableDrivers.slice(0, 5)) {
    console.log(`   - Driver #${driver.id}: ${driver.nombre} - ${driver.placa}`);
    console.log(`     Ubicación: (${driver.coordinates.latitude.toFixed(4)}, ${driver.coordinates.longitude.toFixed(4)})`);
  }
  if (availableDrivers.length > 5) {
    console.log(`   ... y ${availableDrivers.length - 5} más`);
  }
  console.log('');

  // Ejecutar asignación
  console.log('   🔄 Ejecutando algoritmo de asignación...\n');
  
  const assignments = await driverSelectionService.selectDriversForBatches(
    batches,
    RESTAURANT,
    DEFAULT_ASSIGNMENT_CONFIG,
  );

  // ==================== RESULTADOS ====================
  console.log('='.repeat(70));
  console.log('\n📊 RESULTADOS DE LA ASIGNACIÓN\n');

  if (assignments.length === 0) {
    console.log('   ⚠️  No se pudieron asignar batches (no hay conductores cercanos)');
  } else {
    console.log(`   ✅ ${assignments.length} asignaciones realizadas:\n`);

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      console.log(`   ${i + 1}. Batch ${assignment.batch.tempId.slice(-8)} → Driver #${assignment.driver.id} (${assignment.driver.nombre})`);
      console.log(`      📦 Pedidos: ${assignment.batch.orderIds.join(', ')} (${assignment.batch.orders.length} pedidos)`);
      console.log(`      🚗 Conductor: ${assignment.driver.nombre} - ${assignment.driver.placa}`);
      console.log(`      📏 Distancia total: ${assignment.totalDistanceKm.toFixed(2)} km`);
      console.log(`      ⏱️  Tiempo estimado: ${assignment.totalTimeMinutes.toFixed(1)} min`);
      console.log(`      💰 Ganancia: Bs ${assignment.estimatedEarnings.toFixed(2)}`);
      console.log(`      📊 Score: ${assignment.driverScore.toFixed(2)}`);
      console.log('');
    }
  }

  // ==================== RESUMEN ====================
  console.log('='.repeat(70));
  console.log('\n📈 RESUMEN FINAL\n');

  const totalOrders = batches.reduce((sum, b) => sum + b.orders.length, 0);
  const assignedOrders = assignments.reduce((sum, a) => sum + a.batch.orders.length, 0);
  const unassignedBatches = batches.length - assignments.length;

  console.log(`   - Pedidos procesados: ${totalOrders}`);
  console.log(`   - Batches generados (FASE A): ${batches.length}`);
  console.log(`   - Conductores disponibles: ${availableDrivers.length}`);
  console.log(`   - Asignaciones realizadas (FASE B): ${assignments.length}`);
  console.log(`   - Pedidos asignados: ${assignedOrders}`);
  
  if (unassignedBatches > 0) {
    console.log(`   ⚠️  Batches sin asignar: ${unassignedBatches}`);
  }

  console.log('\n✅ Test completado!\n');
  
  await prisma.$disconnect();
  redisService.onModuleDestroy(); // Cerrar Redis
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  redisService.onModuleDestroy(); // Cerrar Redis
  process.exit(1);
});

