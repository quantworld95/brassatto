# Sistema de Asignación de Pedidos - Food Delivery

Sistema completo de asignación automática de pedidos tipo Uber Eats/Rappi, con algoritmo de optimización de rutas, clustering de pedidos, y PWA para pruebas en tiempo real.

## 📋 Descripción

Sistema inteligente de asignación de pedidos que agrupa órdenes geográficamente cercanas, selecciona el mejor conductor disponible, optimiza rutas de entrega y gestiona ofertas de viaje en tiempo real mediante WebSocket.

## 🏗️ Arquitectura

### Backend (NestJS)
- **Sistema de Asignación**: Algoritmo multi-fase (A-E) para agrupar, asignar y optimizar entregas
- **WebSocket**: Comunicación en tiempo real con conductores
- **Redis**: Almacenamiento de ubicación de conductores en tiempo real
- **Google Maps API**: Optimización de rutas y cálculo de ETAs reales
- **PostgreSQL**: Base de datos principal con Prisma ORM

### Frontend (PWA)
- **Vista Cliente**: Crear pedidos con ubicación editable
- **Vista Conductor**: Conectar, actualizar ubicación (GPS/manual), recibir ofertas
- **Vista Admin**: Dashboard de monitoreo de conductores y pedidos

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (v18+)
- PostgreSQL
- Redis (opcional, pero recomendado)
- Google Maps API Key

### 1. Clonar el Repositorio

```bash
git clone https://github.com/quantworld95/brassatto.git
cd brassatto
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y configurar:
# - DATABASE_URL
# - GOOGLE_MAPS_API_KEY
# - REDIS_HOST (opcional)
# - REDIS_PORT (opcional)

# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Poblar base de datos
npm run prisma:seed

# Iniciar servidor
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`

### 3. Configurar Frontend (PWA)

```bash
cd frontend

# Editar index.html y agregar tu Google Maps API Key
# Buscar: TU_GOOGLE_MAPS_API_KEY
# Reemplazar con tu API key real

# Iniciar servidor local
npx --yes http-server -p 8080 -c-1 --host 0.0.0.0
```

La PWA estará disponible en `http://localhost:8080`

### 4. Configurar Redis (Opcional pero Recomendado)

Ver guía completa en: `backend/REDIS_SETUP.md`

```bash
# Windows (con Chocolatey)
choco install redis-64

# O descargar desde: https://github.com/microsoftarchive/redis/releases
```

## 📚 Documentación

### Backend

- **Diseño del Sistema**: `backend/DisenoAsig.md` - Documentación completa del algoritmo de asignación
- **Google Maps Setup**: `backend/GOOGLE_MAPS_SETUP.md` - Configuración de Google Maps API
- **Redis Setup**: `backend/REDIS_SETUP.md` - Instalación y configuración de Redis

### Frontend

- **PWA Guide**: `frontend/README.md` - Guía completa de la PWA
- **Instrucciones Móvil**: `frontend/INSTRUCCIONES_CELULAR.md` - Cómo acceder desde celular

## 🧩 Sistema de Asignación

### Fases del Algoritmo

**Fase A - Clustering**
- Agrupa pedidos geográficamente cercanos usando DBSCAN
- Crea batches de 2-4 pedidos máximo
- Considera tiempo de espera máximo (600 segundos)

**Fase B - Selección de Conductor**
- Filtra conductores disponibles por radio
- Calcula score basado en ETA y tiempo de inactividad
- Asigna batch al mejor conductor disponible

**Fase C - Optimización de Ruta**
- Usa Google Distance Matrix API para distancias reales
- Resuelve TSP pequeño (2-4 paradas) por permutaciones
- Genera secuencia óptima de entrega

**Fase D - Oferta de Viaje**
- Crea oferta con ruta optimizada
- Envía vía WebSocket al conductor
- Expira después de tiempo configurado

**Fase E - Persistencia**
- Solo persiste cuando conductor acepta
- Crea `DeliveryBatch` y `DeliveryStop` en transacción atómica
- Actualiza estado del conductor a `OCUPADO`

### Flujo Completo

```
1. Cliente crea pedido → Estado: READY_FOR_PICKUP
2. Orquestrador espera 3 minutos (acumulación)
3. Ejecuta algoritmo (Fases A-E)
4. Envía oferta al conductor vía WebSocket
5. Conductor acepta/rechaza
6. Si acepta → Persiste en BD
7. Si rechaza → No reasigna (configurable)
```

## 🧪 Pruebas

### Scripts de Prueba Disponibles

```bash
cd backend

# Probar clustering (Fase A)
npm run test:clustering

# Probar selección de conductor (Fases A-B)
npm run test:driver-selection

# Probar asignación completa (Fases A-C)
npm run test:full-assignment

# Probar orquestrador completo (Fases A-E)
npm run test:orchestrator
```

### Prueba End-to-End con PWA

1. **Iniciar Backend**: `npm run start:dev` (puerto 3000)
2. **Iniciar Frontend**: `npx http-server -p 8080` (puerto 8080)
3. **Abrir PWA**: `http://localhost:8080`
4. **Vista Cliente**: Crear 2-3 pedidos con ubicaciones diferentes
5. **Vista Conductor**: Conectar 1-2 conductores, actualizar ubicación
6. **Esperar 3 minutos**: El algoritmo procesará automáticamente
7. **Conductor recibe oferta**: Ver ruta optimizada en el mapa
8. **Aceptar oferta**: Se persiste en la base de datos

## 📱 PWA - Vistas Disponibles

### Vista Cliente
- Crear pedidos predeterminados
- Editar coordenadas de entrega
- Visualizar punto de entrega en mapa
- Crear pedido vía API REST

### Vista Conductor
- Conectar con ID de conductor
- Obtener ubicación GPS real
- Actualizar ubicación manualmente
- Recibir ofertas de viaje
- Visualizar ruta optimizada en mapa
- Aceptar/rechazar ofertas

### Vista Admin
- Dashboard de monitoreo
- Ver todos los conductores en mapa
- Ver estado de conductores
- Ver pedidos pendientes
- Actualización automática cada 5 segundos

## 🔧 Tecnologías

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos
- **Redis** - Cache y ubicación en tiempo real
- **Socket.IO** - WebSocket para comunicación en tiempo real
- **Google Maps API** - Optimización de rutas y ETAs
- **Event Emitter** - Comunicación entre módulos

### Frontend
- **HTML/CSS/JavaScript** - PWA vanilla
- **Google Maps JavaScript API** - Visualización de mapas
- **Socket.IO Client** - WebSocket cliente
- **Fetch API** - Llamadas REST

## 📁 Estructura del Proyecto

```
.
├── backend/
│   ├── src/
│   │   ├── assignment/          # Sistema de asignación
│   │   │   ├── clustering/      # Fase A
│   │   │   ├── driver-selection/ # Fase B
│   │   │   ├── route-optimizer/  # Fase C
│   │   │   ├── offer/            # Fase D
│   │   │   ├── persistence/      # Fase E
│   │   │   └── orchestrator/     # Coordinador
│   │   ├── common/               # Servicios compartidos (Redis)
│   │   ├── order/                # Módulo de órdenes
│   │   ├── user/                 # Módulo de usuarios
│   │   └── menu/                 # Módulo de menú
│   ├── prisma/
│   │   ├── schema.prisma        # Esquema de BD
│   │   └── seeds/               # Datos de prueba
│   └── scripts/                 # Scripts de prueba
│
├── frontend/
│   ├── index.html               # Página principal
│   ├── css/
│   │   └── styles.css           # Estilos
│   ├── js/
│   │   ├── app.js               # Router
│   │   ├── api.js               # API REST
│   │   ├── map.js               # Google Maps helper
│   │   ├── cliente/
│   │   │   └── ordenes.js       # Vista cliente
│   │   ├── conductor/
│   │   │   └── conductor.js     # Vista conductor
│   │   └── admin/
│   │       └── admin.js         # Vista admin
│   └── manifest.json            # PWA manifest
│
└── README.md                     # Este archivo
```

## 🔑 Variables de Entorno

### Backend (.env)

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/food_delivery?schema=public"

# Google Maps API
GOOGLE_MAPS_API_KEY="tu_api_key_aqui"

# Redis (opcional)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Puerto del servidor
PORT=3000
```

### Frontend

Editar `frontend/index.html`:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=places"></script>
```

## 🚦 Estado del Proyecto

✅ **Completado:**
- Sistema de asignación completo (Fases A-E)
- Integración con Google Maps API
- Integración con Redis
- WebSocket para comunicación en tiempo real
- PWA completa con 3 vistas
- Actualización manual y GPS de ubicación
- Visualización de rutas optimizadas

🔄 **En desarrollo:**
- Mejoras de rendimiento
- Optimizaciones adicionales

## 📝 Notas Importantes

- **ID del Conductor**: Usa el `id` de la tabla `conductor`, no el `usuarioId`
- **Delay de Procesamiento**: 3 minutos después del primer pedido `READY_FOR_PICKUP`
- **Reasignación**: Actualmente deshabilitada (no reasigna si conductor rechaza)
- **Ubicación en Tiempo Real**: Requiere Redis para funcionar correctamente
- **HTTPS**: Necesario para GPS en producción (localhost funciona sin HTTPS)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es parte de un trabajo académico.

## 👤 Autor

Desarrollado como parte del curso de Interacción Humano-Computadora (IHC).

---

Para más detalles, consulta la documentación en los archivos README.md de cada directorio.

