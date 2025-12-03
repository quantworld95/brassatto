/**
 * Script de prueba completo: FASE A + FASE B + FASE C
 * 
 * Ejecutar con: npx ts-node scripts/test-full-assignment.ts
 * 
 * IMPORTANTE: Requiere GOOGLE_MAPS_API_KEY en el archivo .env
 */

import { PrismaClient } from '@prisma/client';
import { ClusteringService } from '../src/assignment/clustering/clustering.service';
import { DriverSelectionService } from '../src/assignment/driver-selection/driver-selection.service';
import { RouteOptimizerService } from '../src/assignment/route-optimizer/route-optimizer.service';
import { GoogleMapsService } from '../src/assignment/route-optimizer/google-maps.service';
import { RedisService } from '../src/common/redis.service';
import { DEFAULT_ASSIGNMENT_CONFIG, RestaurantInfo } from '../src/assignment/types/assignment.types';

const prisma = new PrismaClient();

// Crear instancias de servicios
const redisService = new RedisService();
redisService.onModuleInit(); // Inicializar Redis manualmente
const googleMapsService = new GoogleMapsService();
const clusteringService = new ClusteringService(prisma as any);
const driverSelectionService = new DriverSelectionService(prisma as any, redisService);
const routeOptimizerService = new RouteOptimizerService(googleMapsService);

// Coordenadas del restaurante - Plaza 24 de Septiembre
const RESTAURANT: RestaurantInfo = {
  name: 'Restaurante Plaza 24',
  address: 'Plaza 24 de Septiembre, Santa Cruz',
  coordinates: {
    latitude: -17.7833,
    longitude: -63.1821,
  },
};

async function main() {
  console.log('🧪 TEST COMPLETO: FASE A + B + C\n');
  console.log('='.repeat(80));

  // Verificar Google Maps API Key
  console.log('\n🔑 Verificando configuración de Google Maps API...\n');
  
  if (!googleMapsService.isConfigured()) {
    console.log('   ❌ ERROR: GOOGLE_MAPS_API_KEY no configurada');
    console.log('   Por favor, agrega tu API key en el archivo .env:');
    console.log('   GOOGLE_MAPS_API_KEY=tu_api_key_aqui\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('   ✅ Google Maps API configurada');
  const usageInfo = googleMapsService.getUsageInfo();
  console.log(`   💰 Costo estimado: $${usageInfo.costPerElement}/elemento\n`);

  // ==================== FASE A ====================
  console.log('='.repeat(80));
  console.log('\n📦 FASE A: CLUSTERING DE PEDIDOS\n');
  
  const batches = await clusteringService.createBatches(DEFAULT_ASSIGNMENT_CONFIG);
  
  if (batches.length === 0) {
    console.log('   ⚠️  No hay batches. Ejecuta: npx prisma db seed');
    await prisma.$disconnect();
    return;
  }

  console.log(`   ✅ ${batches.length} batches generados\n`);

  // ==================== FASE B ====================
  console.log('='.repeat(80));
  console.log('\n🚗 FASE B: SELECCIÓN DE CONDUCTORES\n');

  const assignments = await driverSelectionService.selectDriversForBatches(
    batches,
    RESTAURANT,
    DEFAULT_ASSIGNMENT_CONFIG,
  );

  if (assignments.length === 0) {
    console.log('   ⚠️  No se pudieron asignar batches');
    await prisma.$disconnect();
    return;
  }

  console.log(`   ✅ ${assignments.length} asignaciones realizadas\n`);

  // ==================== FASE C ====================
  console.log('='.repeat(80));
  console.log('\n🗺️  FASE C: OPTIMIZACIÓN DE RUTAS (TSP con Google Maps)\n');

  console.log('   ⏳ Consultando Google Distance Matrix API...\n');

  // Optimizar rutas para cada assignment
  const optimizedAssignments = [];

  for (const assignment of assignments) {
    try {
      const optimizedStops = await routeOptimizerService.optimizeRoute(
        assignment.batch,
        RESTAURANT,
      );

      // Actualizar el assignment con la ruta optimizada
      const totalDistance = optimizedStops.reduce(
        (sum, s) => sum + s.distanceFromPreviousKm,
        0,
      );
      const totalTime = optimizedStops.reduce(
        (sum, s) => sum + s.etaFromPreviousMinutes,
        0,
      );

      optimizedAssignments.push({
        ...assignment,
        optimizedRoute: optimizedStops,
        totalDistanceKm: totalDistance,
        totalTimeMinutes: totalTime,
      });

      console.log(`   ✅ Batch ${assignment.batch.tempId.slice(-8)} optimizado`);
    } catch (error) {
      console.log(`   ❌ Error optimizando batch ${assignment.batch.tempId.slice(-8)}: ${error.message}`);
    }
  }

  // ==================== RESULTADOS FINALES ====================
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTADOS COMPLETOS\n');

  for (let i = 0; i < optimizedAssignments.length; i++) {
    const assignment = optimizedAssignments[i];
    
    console.log(`${'━'.repeat(80)}`);
    console.log(`\n   🎯 ASIGNACIÓN ${i + 1}\n`);
    
    console.log(`   📦 Batch: ${assignment.batch.tempId.slice(-8)}`);
    console.log(`   🚗 Conductor: ${assignment.driver.nombre} (${assignment.driver.placa})`);
    console.log(`   📍 Pedidos: ${assignment.batch.orderIds.length}`);
    console.log('');

    console.log(`   🗺️  RUTA OPTIMIZADA:`);
    console.log(`      Inicio: ${RESTAURANT.name}`);
    
    for (const stop of assignment.optimizedRoute) {
      console.log(`      └─► Stop ${stop.sequence}: Order #${stop.orderId}`);
      console.log(`          Distancia: ${stop.distanceFromPreviousKm.toFixed(2)} km`);
      console.log(`          Tiempo: ${stop.etaFromPreviousMinutes.toFixed(1)} min`);
      console.log(`          Dirección: ${stop.address || 'N/A'}`);
    }

    console.log('');
    console.log(`   📏 TOTALES:`);
    console.log(`      Distancia total: ${assignment.totalDistanceKm.toFixed(2)} km`);
    console.log(`      Tiempo total estimado: ${assignment.totalTimeMinutes.toFixed(1)} min`);
    console.log(`      Ganancia estimada: Bs ${assignment.estimatedEarnings.toFixed(2)}`);
    console.log('');
  }

  // ==================== RESUMEN ====================
  console.log('='.repeat(80));
  console.log('\n📈 RESUMEN FINAL\n');

  const totalOrders = batches.reduce((sum, b) => sum + b.orders.length, 0);
  const totalDistance = optimizedAssignments.reduce(
    (sum, a) => sum + a.totalDistanceKm,
    0,
  );
  const totalTime = optimizedAssignments.reduce(
    (sum, a) => sum + a.totalTimeMinutes,
    0,
  );
  const totalEarnings = optimizedAssignments.reduce(
    (sum, a) => sum + a.estimatedEarnings,
    0,
  );

  // Calcular elementos de API usados
  const elementsUsed = optimizedAssignments.reduce((sum, a) => {
    const points = a.batch.orders.length + 1; // clientes + restaurante
    return sum + (points * points);
  }, 0);
  const apiCost = elementsUsed * 0.005;

  console.log(`   ✅ Algoritmo completado exitosamente`);
  console.log('');
  console.log(`   📦 Pedidos procesados: ${totalOrders}`);
  console.log(`   🚗 Conductores asignados: ${optimizedAssignments.length}`);
  console.log(`   📏 Distancia total (todas las rutas): ${totalDistance.toFixed(2)} km`);
  console.log(`   ⏱️  Tiempo total estimado: ${totalTime.toFixed(1)} min`);
  console.log(`   💰 Ganancias totales: Bs ${totalEarnings.toFixed(2)}`);
  console.log('');
  console.log(`   🌐 Google Maps API:`);
  console.log(`      Elementos usados: ${elementsUsed}`);
  console.log(`      Costo aproximado: $${apiCost.toFixed(4)} USD`);

  console.log('\n✅ Test completado!\n');
  
  await prisma.$disconnect();
  redisService.onModuleDestroy(); // Cerrar Redis
}

main().catch(async (e) => {
  console.error('\n❌ Error:', e);
  await prisma.$disconnect();
  redisService.onModuleDestroy(); // Cerrar Redis
  process.exit(1);
});

