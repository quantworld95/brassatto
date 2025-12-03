/**
 * Script de prueba para el servicio de Clustering (FASE A)
 * 
 * Ejecutar con: npx ts-node scripts/test-clustering.ts
 */

import { PrismaClient } from '@prisma/client';
import { ClusteringService } from '../src/assignment/clustering/clustering.service';
import { haversineDistance } from '../src/assignment/utils/haversine.util';
import { DEFAULT_ASSIGNMENT_CONFIG } from '../src/assignment/types/assignment.types';

// Mock del PrismaService para usar directamente PrismaClient
const prisma = new PrismaClient();

// Crear instancia del servicio con mock
const clusteringService = new ClusteringService(prisma as any);

async function main() {
  console.log('🧪 TEST: Clustering Service (FASE A)\n');
  console.log('='.repeat(60));

  // Mostrar configuración actual
  console.log('\n📋 Configuración:');
  console.log(`   - Radio de clustering: ${DEFAULT_ASSIGNMENT_CONFIG.clusterRadiusKm} km`);
  console.log(`   - Máx pedidos por batch: ${DEFAULT_ASSIGNMENT_CONFIG.maxOrdersPerBatch}`);
  console.log(`   - Tiempo máx espera: ${DEFAULT_ASSIGNMENT_CONFIG.maxWaitTimeSeconds} seg`);

  // Paso 1: Obtener pedidos elegibles
  console.log('\n' + '='.repeat(60));
  console.log('📦 PASO 1: Obtener pedidos elegibles (READY_FOR_PICKUP)\n');
  
  const eligibleOrders = await clusteringService.getEligibleOrders();
  
  console.log(`   Encontrados: ${eligibleOrders.length} pedidos\n`);
  
  if (eligibleOrders.length === 0) {
    console.log('   ⚠️  No hay pedidos elegibles. Ejecuta primero:');
    console.log('       npx prisma db seed');
    await prisma.$disconnect();
    return;
  }

  // Mostrar pedidos
  console.log('   Pedidos elegibles:');
  for (const order of eligibleOrders) {
    console.log(`   - Order #${order.id}: (${order.coordinates.latitude.toFixed(4)}, ${order.coordinates.longitude.toFixed(4)}) - ${order.notes || order.address}`);
  }

  // Paso 2: Ejecutar clustering
  console.log('\n' + '='.repeat(60));
  console.log('🔗 PASO 2: Ejecutar clustering (DBSCAN)\n');

  const batches = clusteringService.clusterOrders(eligibleOrders);

  console.log(`   Batches generados: ${batches.length}\n`);

  // Mostrar resultados
  for (const batch of batches) {
    console.log(`   📦 Batch ${batch.tempId.slice(-8)}:`);
    console.log(`      - Pedidos: ${batch.orderIds.join(', ')}`);
    console.log(`      - Cantidad: ${batch.orders.length}`);
    console.log(`      - Centroide: (${batch.centroid.latitude.toFixed(4)}, ${batch.centroid.longitude.toFixed(4)})`);
    console.log(`      - Distancia estimada: ${batch.estimatedDistanceKm.toFixed(2)} km`);
    
    // Mostrar direcciones
    for (const order of batch.orders) {
      console.log(`        └─ Order #${order.id}: ${order.notes || order.address}`);
    }
    console.log('');
  }

  // Paso 3: Verificar distancias dentro de cada cluster
  console.log('='.repeat(60));
  console.log('📏 PASO 3: Verificar distancias entre pedidos en cada batch\n');

  for (const batch of batches) {
    if (batch.orders.length > 1) {
      console.log(`   Batch ${batch.tempId.slice(-8)}:`);
      for (let i = 0; i < batch.orders.length; i++) {
        for (let j = i + 1; j < batch.orders.length; j++) {
          const dist = haversineDistance(
            batch.orders[i].coordinates,
            batch.orders[j].coordinates
          );
          console.log(`      Order #${batch.orders[i].id} ↔ Order #${batch.orders[j].id}: ${dist.toFixed(3)} km`);
        }
      }
    } else {
      console.log(`   Batch ${batch.tempId.slice(-8)}: Solo 1 pedido (outlier o individual)`);
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:\n');
  console.log(`   - Pedidos procesados: ${eligibleOrders.length}`);
  console.log(`   - Batches generados: ${batches.length}`);
  
  const batchesConMultiples = batches.filter(b => b.orders.length > 1).length;
  const batchesIndividuales = batches.filter(b => b.orders.length === 1).length;
  
  console.log(`   - Batches con múltiples pedidos: ${batchesConMultiples}`);
  console.log(`   - Batches individuales: ${batchesIndividuales}`);
  console.log('\n✅ Test completado!');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});

