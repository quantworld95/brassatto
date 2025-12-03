import { PrismaClient } from '@prisma/client';
import { seedMenu } from './seeds/menu.seed';
import { seedUsers } from './seeds/users.seed';
import { seedOrders } from './seeds/orders.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Seed del menú (categorías, productos, guarniciones)
  await seedMenu(prisma);
  
  console.log('');
  
  // Seed de usuarios (admins, conductores, clientes)
  await seedUsers(prisma);

  console.log('');

  // Seed de pedidos de prueba para clustering
  await seedOrders(prisma);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
