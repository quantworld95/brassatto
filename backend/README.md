# Food Delivery Backend

Backend para sistema de food delivery desarrollado con NestJS, Prisma y PostgreSQL.

## Tecnologías

- NestJS
- Prisma ORM
- PostgreSQL
- TypeScript

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` y configurar la URL de la base de datos:
```
DATABASE_URL="postgresql://user:password@localhost:5432/food_delivery?schema=public"
```

3. Generar cliente de Prisma:
```bash
npm run prisma:generate
```

4. Ejecutar migraciones:
```bash
npm run prisma:migrate
```

## Estructura de Módulos

- `menu`: Gestión de categorías, productos y acompañamientos
- `order`: Gestión de órdenes y items
- `user`: Gestión de usuarios

## Scripts Disponibles

- `npm run start:dev`: Inicia el servidor en modo desarrollo
- `npm run build`: Compila el proyecto
- `npm run prisma:generate`: Genera el cliente de Prisma
- `npm run prisma:migrate`: Ejecuta migraciones
- `npm run prisma:studio`: Abre Prisma Studio

