import { PrismaClient, OrderStatus, PaymentMethod } from '@prisma/client';

/**
 * Seed de pedidos de prueba para testing del clustering.
 * 
 * Creamos pedidos con coordenadas específicas en Santa Cruz, Bolivia
 * que deberían formar clusters distintos.
 * 
 * Referencia: Plaza 24 de Septiembre (-17.7833, -63.1821)
 * 
 * CLUSTER A (zona norte): 3 pedidos cercanos
 * CLUSTER B (zona sur): 2 pedidos cercanos
 * OUTLIER: 1 pedido alejado
 */
export async function seedOrders(prisma: PrismaClient) {
  console.log('📦 Seeding orders for clustering test...');

  // Obtener clientes existentes
  const clientes = await prisma.cliente.findMany({ take: 9 });
  
  if (clientes.length === 0) {
    console.log('  ⚠️ No clients found. Please run users seed first.');
    return;
  }

  // Obtener un producto para los pedidos
  const producto = await prisma.product.findFirst();
  
  if (!producto) {
    console.log('  ⚠️ No products found. Please run menu seed first.');
    return;
  }

  // Base: Plaza 24 de Septiembre
  const baseLat = -17.7833;
  const baseLon = -63.1821;

  // Coordenadas diseñadas para formar clusters específicos
  const ordersData = [
    // CLUSTER A - Zona Norte (3 pedidos cercanos entre sí)
    {
      clienteIndex: 0,
      lat: baseLat - 0.015,
      lng: baseLon + 0.008,
      address: 'Av. Monseñor Rivero, Zona Norte',
      notes: 'Cluster A - Pedido 1',
    },
    {
      clienteIndex: 1,
      lat: baseLat - 0.018,
      lng: baseLon + 0.010,
      address: 'Av. Monseñor Rivero #200, Zona Norte',
      notes: 'Cluster A - Pedido 2',
    },
    {
      clienteIndex: 2,
      lat: baseLat - 0.013,
      lng: baseLon + 0.012,
      address: 'Calle Los Tucos #50, Zona Norte',
      notes: 'Cluster A - Pedido 3',
    },
    
    // CLUSTER B - Zona Sur (2 pedidos cercanos entre sí)
    {
      clienteIndex: 3,
      lat: baseLat + 0.030,
      lng: baseLon - 0.020,
      address: 'Av. Santos Dumont #500, Zona Sur',
      notes: 'Cluster B - Pedido 1',
    },
    {
      clienteIndex: 4,
      lat: baseLat + 0.032,
      lng: baseLon - 0.018,
      address: 'Av. Santos Dumont #600, Zona Sur',
      notes: 'Cluster B - Pedido 2',
    },
    
    // OUTLIER - Pedido alejado (debería quedar solo)
    {
      clienteIndex: 5,
      lat: baseLat - 0.080,
      lng: baseLon - 0.070,
      address: 'Zona Alejada #999',
      notes: 'OUTLIER - Pedido alejado',
    },
  ];

  // Eliminar pedidos de prueba anteriores (por notes)
  await prisma.order.deleteMany({
    where: {
      notes: {
        contains: 'Cluster',
      },
    },
  });
  await prisma.order.deleteMany({
    where: {
      notes: {
        contains: 'OUTLIER',
      },
    },
  });

  // Crear los pedidos
  for (const orderData of ordersData) {
    const cliente = clientes[orderData.clienteIndex % clientes.length];
    
    await prisma.order.create({
      data: {
        clienteId: cliente.id,
        status: OrderStatus.READY_FOR_PICKUP,
        paymentMethod: PaymentMethod.CASH,
        total: 50.00,
        address: orderData.address,
        latitude: orderData.lat,
        longitude: orderData.lng,
        notes: orderData.notes,
        items: {
          create: {
            productId: producto.id,
            quantity: 1,
            price: 50.00,
          },
        },
      },
    });
  }

  console.log('  ✅ 6 test orders created:');
  console.log('     - Cluster A (norte): 3 pedidos');
  console.log('     - Cluster B (sur): 2 pedidos');
  console.log('     - Outlier: 1 pedido');
}

