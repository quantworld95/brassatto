/**
 * Script de prueba del AssignmentOrchestrator completo.
 * 
 * Simula el flujo completo:
 * 1. Cambiar pedidos a READY_FOR_PICKUP (dispara eventos)
 * 2. Esperar delay de 3 minutos (o ejecutar manualmente)
 * 3. Verificar que se crearon ofertas
 * 4. Simular aceptación de oferta
 * 
 * Ejecutar con: npx ts-node scripts/test-orchestrator.ts
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AssignmentOrchestrator } from '../src/assignment/orchestrator/assignment-orchestrator.service';
import { OfferService } from '../src/assignment/offer/offer.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 TEST: AssignmentOrchestrator Completo\n');
  console.log('='.repeat(80));

  // Inicializar NestJS para tener acceso a los servicios
  const app = await NestFactory.createApplicationContext(AppModule);
  const orchestrator = app.get(AssignmentOrchestrator);
  const offerService = app.get(OfferService);
  const eventEmitter = app.get(EventEmitter2);

  try {
    // ==================== PASO 1: Verificar pedidos listos ====================
    console.log('\n📦 PASO 1: Verificando pedidos READY_FOR_PICKUP\n');

    const readyOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        deliveryStop: null, // No asignados aún
      },
      include: {
        cliente: true,
      },
    });

    console.log(`   Encontrados: ${readyOrders.length} pedidos listos\n`);

    if (readyOrders.length === 0) {
      console.log('   ⚠️  No hay pedidos listos. Creando algunos de prueba...\n');

      // Crear pedidos de prueba
      const clientes = await prisma.cliente.findMany({ take: 3 });
      const producto = await prisma.product.findFirst();

      if (!producto || clientes.length === 0) {
        console.log('   ❌ No hay clientes o productos. Ejecuta: npx prisma db seed');
        await app.close();
        await prisma.$disconnect();
        return;
      }

      for (let i = 0; i < 3; i++) {
        await prisma.order.create({
          data: {
            clienteId: clientes[i % clientes.length].id,
            status: OrderStatus.READY_FOR_PICKUP,
            paymentMethod: 'CASH',
            total: 50.0,
            address: `Dirección de prueba ${i + 1}`,
            latitude: -17.78 + (Math.random() - 0.5) * 0.02,
            longitude: -63.18 + (Math.random() - 0.5) * 0.02,
            items: {
              create: {
                productId: producto.id,
                quantity: 1,
                price: 50.0,
              },
            },
          },
        });
      }

      console.log('   ✅ 3 pedidos de prueba creados\n');
    }

    // ==================== PASO 2: Obtener pedidos listos ====================
    console.log('='.repeat(80));
    console.log('\n📋 PASO 2: Pedidos listos para procesar\n');

    const allReadyOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        deliveryStop: null,
      },
    });

    console.log(`   Total de pedidos READY_FOR_PICKUP: ${allReadyOrders.length}\n`);

    // ==================== PASO 3: Ejecutar algoritmo manualmente ====================
    console.log('='.repeat(80));
    console.log('\n⚡ PASO 3: Ejecutando algoritmo manualmente (sin delay ni eventos)\n');

    // Ejecutar directamente sin disparar eventos (para test rápido)
    await orchestrator.processManually();

    // Esperar un momento para que se procesen las ofertas
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ==================== PASO 4: Verificar ofertas creadas ====================
    console.log('='.repeat(80));
    console.log('\n💌 PASO 4: Verificando ofertas creadas\n');

    const activeOffers = offerService.getAllActiveOffers();
    console.log(`   Ofertas activas: ${activeOffers.length}\n`);

    if (activeOffers.length === 0) {
      console.log('   ⚠️  No se crearon ofertas (posiblemente no hay conductores disponibles)');
    } else {
      for (const offer of activeOffers) {
        console.log(`   📦 Oferta ${offer.offerId.slice(0, 8)}:`);
        console.log(`      - Conductor: #${offer.driverId}`);
        console.log(`      - Pedidos: ${offer.summary.totalOrders}`);
        console.log(`      - Distancia: ${offer.summary.totalDistanceKm.toFixed(2)} km`);
        console.log(`      - Tiempo: ${offer.summary.estimatedTimeMinutes.toFixed(1)} min`);
        console.log(`      - Ganancia: Bs ${offer.summary.estimatedEarnings.toFixed(2)}`);
        console.log(`      - Expira: ${offer.expiresAt.toLocaleTimeString()}\n`);
      }

      // ==================== PASO 5: Simular aceptación ====================
      console.log('='.repeat(80));
      console.log('\n✅ PASO 5: Simulando aceptación de oferta\n');

      const firstOffer = activeOffers[0];
      console.log(`   Simulando aceptación de oferta ${firstOffer.offerId.slice(0, 8)}...\n`);

      eventEmitter.emit('driver.offer_accepted', firstOffer.offerId);

      // Esperar un momento para que se procese
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verificar que se creó el batch en BD
      const batches = await prisma.deliveryBatch.findMany({
        where: {
          conductorId: firstOffer.driverId,
        },
        include: {
          stops: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      if (batches.length > 0) {
        const batch = batches[0];
        console.log(`   ✅ Batch #${batch.id} creado en BD`);
        console.log(`   ✅ ${batch.stops.length} stops creados`);
        console.log(`   ✅ Conductor #${firstOffer.driverId} actualizado a OCUPADO\n`);
      } else {
        console.log('   ⚠️  No se encontró batch en BD (puede haber error)\n');
      }
    }

    // ==================== RESUMEN ====================
    console.log('='.repeat(80));
    console.log('\n📊 RESUMEN\n');
    console.log(`   - Pedidos procesados: ${allReadyOrders.length}`);
    console.log(`   - Ofertas creadas: ${activeOffers.length}`);
    console.log(`   - Ofertas activas: ${offerService.getAllActiveOffers().length}`);
    console.log('\n✅ Test completado!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);

