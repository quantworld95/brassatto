/**
 * Script para verificar conductores disponibles y su distancia al restaurante
 */

import { PrismaClient } from '@prisma/client';
import { haversineDistance } from '../src/assignment/utils/haversine.util';

const prisma = new PrismaClient();

const RESTAURANT = {
  latitude: -17.7833,
  longitude: -63.1821,
};

async function main() {
  console.log('🔍 Verificando conductores disponibles\n');
  console.log('='.repeat(80));

  // Obtener todos los conductores
  const allDrivers = await prisma.conductor.findMany({
    include: {
      usuario: true,
    },
  });

  console.log(`Total de conductores en BD: ${allDrivers.length}\n`);

  // Contar por estado
  const byEstado = {
    DISPONIBLE: 0,
    OCUPADO: 0,
    DESCONECTADO: 0,
  };

  for (const driver of allDrivers) {
    byEstado[driver.estado]++;
  }

  console.log('📊 Conductores por estado:');
  console.log(`   DISPONIBLE: ${byEstado.DISPONIBLE}`);
  console.log(`   OCUPADO: ${byEstado.OCUPADO}`);
  console.log(`   DESCONECTADO: ${byEstado.DESCONECTADO}\n`);

  // Filtrar DISPONIBLES con coordenadas
  const disponibles = allDrivers.filter(
    (d) =>
      d.estado === 'DISPONIBLE' &&
      d.latitudActual !== null &&
      d.longitudActual !== null,
  );

  console.log(`✅ Conductores DISPONIBLES con coordenadas: ${disponibles.length}\n`);

  if (disponibles.length === 0) {
    console.log('❌ PROBLEMA: No hay conductores DISPONIBLES con coordenadas\n');
    await prisma.$disconnect();
    return;
  }

  // Verificar distancia al restaurante
  console.log('📏 Distancia al restaurante (Plaza 24):\n');
  console.log('   Radio máximo configurado: 3 km\n');

  const dentroRadio: typeof disponibles = [];
  const fueraRadio: typeof disponibles = [];

  for (const driver of disponibles) {
    const distancia = haversineDistance(
      RESTAURANT,
      {
        latitude: Number(driver.latitudActual),
        longitude: Number(driver.longitudActual),
      },
    );

    if (distancia <= 3) {
      dentroRadio.push(driver);
      console.log(
        `   ✅ Driver #${driver.id} (${driver.usuario.nombre}): ${distancia.toFixed(2)} km`,
      );
    } else {
      fueraRadio.push(driver);
      console.log(
        `   ❌ Driver #${driver.id} (${driver.usuario.nombre}): ${distancia.toFixed(2)} km (FUERA)`,
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN:\n');
  console.log(`   Total conductores: ${allDrivers.length}`);
  console.log(`   DISPONIBLES: ${byEstado.DISPONIBLE}`);
  console.log(`   DISPONIBLES con coordenadas: ${disponibles.length}`);
  console.log(`   ✅ Dentro del radio (≤ 3 km): ${dentroRadio.length}`);
  console.log(`   ❌ Fuera del radio (> 3 km): ${fueraRadio.length}\n`);

  if (dentroRadio.length === 0) {
    console.log('⚠️  PROBLEMA: No hay conductores dentro del radio de 3 km');
    console.log('   Soluciones:');
    console.log('   1. Aumentar maxDriverRadiusKm en la configuración');
    console.log('   2. Crear más conductores cerca del restaurante');
    console.log('   3. Actualizar coordenadas de conductores existentes\n');
  } else {
    console.log(`✅ Hay ${dentroRadio.length} conductores disponibles para asignar\n`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

