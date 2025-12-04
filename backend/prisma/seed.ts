import { PrismaClient } from '@prisma/client';
import { seedMenu } from './seeds/menu.seed';
import { seedUsers } from './seeds/users.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Seed del menú (categorías, productos, guarniciones)
  await seedMenu(prisma);
  
  console.log('');
  
  // Seed de usuarios (admins, conductores, clientes)
  await seedUsers(prisma);

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
