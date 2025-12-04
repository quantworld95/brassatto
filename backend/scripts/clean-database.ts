import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Cleaning database (users and related data only)...\n');
  console.log('⚠️  NOT deleting: Categories, Products, SideDishes\n');

  try {
    // Eliminar en orden: primero las relaciones dependientes, luego los usuarios
    // NO se eliminan: Categories, Products, SideDishes
    
    console.log('  🗑️  Deleting delivery stops...');
    await prisma.deliveryStop.deleteMany({});
    console.log('  ✅ Delivery stops deleted');

    console.log('  🗑️  Deleting delivery batches...');
    await prisma.deliveryBatch.deleteMany({});
    console.log('  ✅ Delivery batches deleted');

    console.log('  🗑️  Deleting order item side dishes...');
    await prisma.orderItemSideDish.deleteMany({});
    console.log('  ✅ Order item side dishes deleted');

    console.log('  🗑️  Deleting order items...');
    await prisma.orderItem.deleteMany({});
    console.log('  ✅ Order items deleted');

    console.log('  🗑️  Deleting orders...');
    await prisma.order.deleteMany({});
    console.log('  ✅ Orders deleted');

    console.log('  🗑️  Deleting users (this will cascade delete conductors, clients, admins)...');
    await prisma.usuario.deleteMany({});
    console.log('  ✅ Users deleted (conductors, clients, admins also deleted)');

    console.log('\n🎉 Database cleaned successfully!');
    console.log('✅ Menu data (Categories, Products, SideDishes) preserved');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

