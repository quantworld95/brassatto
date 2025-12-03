import { PrismaClient } from '@prisma/client';

export async function seedMenu(prisma: PrismaClient) {
  console.log('🍽️  Seeding menu...');

  // ==================== CATEGORÍAS ====================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Cortes Clásicos' },
      update: {},
      create: { name: 'Cortes Clásicos' },
    }),
    prisma.category.upsert({
      where: { name: 'Cortes Junior' },
      update: {},
      create: { name: 'Cortes Junior' },
    }),
    prisma.category.upsert({
      where: { name: 'Cortes Select Premium' },
      update: {},
      create: { name: 'Cortes Select Premium' },
    }),
    prisma.category.upsert({
      where: { name: 'Cortes Select Premium Con Hueso' },
      update: {},
      create: { name: 'Cortes Select Premium Con Hueso' },
    }),
    prisma.category.upsert({
      where: { name: 'Extras' },
      update: {},
      create: { name: 'Extras' },
    }),
    prisma.category.upsert({
      where: { name: 'Bebidas' },
      update: {},
      create: { name: 'Bebidas' },
    }),
    prisma.category.upsert({
      where: { name: 'Postre' },
      update: {},
      create: { name: 'Postre' },
    }),
  ]);

  console.log('  ✅ Categories created');

  const cortesClasicos = categories.find((c) => c.name === 'Cortes Clásicos')!;
  const cortesJunior = categories.find((c) => c.name === 'Cortes Junior')!;
  const cortesPremium = categories.find((c) => c.name === 'Cortes Select Premium')!;

  // ==================== PRODUCTOS ====================
  await Promise.all([
    prisma.product.upsert({
      where: { name: 'Pechuga a la Parrilla' },
      update: {},
      create: {
        name: 'Pechuga a la Parrilla',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 47,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Punta de Solomo' },
      update: {},
      create: {
        name: 'Punta de Solomo',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 93,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Bife Chorizo' },
      update: {},
      create: {
        name: 'Bife Chorizo',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 85,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Cuadril para 1 Persona' },
      update: {},
      create: {
        name: 'Cuadril para 1 Persona',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 83,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Asado de Tira' },
      update: {},
      create: {
        name: 'Asado de Tira',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 75,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Pacumuto de Res' },
      update: {},
      create: {
        name: 'Pacumuto de Res',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 70,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesClasicos.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Pacumuto Mixto' },
      update: {},
      create: {
        name: 'Pacumuto Mixto',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 60,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Punta de Solomo Junior' },
      update: {},
      create: {
        name: 'Punta de Solomo Junior',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 68,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Baby Beef' },
      update: {},
      create: {
        name: 'Baby Beef',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 58,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Matambrito de Cerdo' },
      update: {},
      create: {
        name: 'Matambrito de Cerdo',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 74,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Churrasquito' },
      update: {},
      create: {
        name: 'Churrasquito',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 61,
        isBestSeller: true,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Espetinho de Cupim (Jiba)' },
      update: {},
      create: {
        name: 'Espetinho de Cupim (Jiba)',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 47,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesJunior.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Espetinho de Picaña' },
      update: {},
      create: {
        name: 'Espetinho de Picaña',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 47,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesPremium.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Espetinho De Vacio' },
      update: {},
      create: {
        name: 'Espetinho De Vacio',
        description: 'Acompañado de 3 guarniciones a elegir.',
        price: 47,
        isAvailable: true,
        sideDishCount: 3,
        categoryId: cortesPremium.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Picaña (Select Premium)' },
      update: {},
      create: {
        name: 'Picaña (Select Premium)',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 112,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesPremium.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Ojo De Bife (Select Premium)' },
      update: {},
      create: {
        name: 'Ojo De Bife (Select Premium)',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 97,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesPremium.id,
      },
    }),
    prisma.product.upsert({
      where: { name: 'Bife de chorizo (select prem)' },
      update: {},
      create: {
        name: 'Bife de chorizo (select prem)',
        description: 'Acompañado de 4 guarniciones a elegir.',
        price: 95,
        isAvailable: true,
        sideDishCount: 4,
        categoryId: cortesPremium.id,
      },
    }),
  ]);

  console.log('  ✅ Products created');

  // ==================== GUARNICIONES ====================
  await Promise.all([
    prisma.sideDish.upsert({
      where: { name: 'Papas fritas' },
      update: {},
      create: {
        name: 'Papas fritas',
        description: 'Papas fritas crujientes',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Ensalada mixta' },
      update: {},
      create: {
        name: 'Ensalada mixta',
        description: 'Ensalada fresca con vegetales variados',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Arroz' },
      update: {},
      create: {
        name: 'Arroz',
        description: 'Arroz blanco',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Puré de papa' },
      update: {},
      create: {
        name: 'Puré de papa',
        description: 'Puré de papas cremoso',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Ensalada repollo' },
      update: {},
      create: {
        name: 'Ensalada repollo',
        description: 'Ensalada de repollo fresco',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Ensalada de vainita' },
      update: {},
      create: {
        name: 'Ensalada de vainita',
        description: 'Ensalada de vainitas verdes',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Ensalada remolacha' },
      update: {},
      create: {
        name: 'Ensalada remolacha',
        description: 'Ensalada de remolacha',
      },
    }),
    prisma.sideDish.upsert({
      where: { name: 'Arroz con queso' },
      update: {},
      create: {
        name: 'Arroz con queso',
        description: 'Arroz con queso derretido',
      },
    }),
  ]);

  console.log('  ✅ Side dishes created');
}

