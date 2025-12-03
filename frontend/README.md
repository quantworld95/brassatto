# Driver PWA - Sistema de Asignación de Pedidos

PWA para pruebas del sistema de asignación de pedidos con múltiples vistas.

## 🚀 Configuración Rápida

### 1. Configurar Google Maps API Key

Edita `index.html` y reemplaza `TU_GOOGLE_MAPS_API_KEY` con tu API key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=TU_GOOGLE_MAPS_API_KEY&libraries=places"></script>
```

### 2. Configurar URL del Backend

Edita `js/app.js` y `js/api.js` si tu backend está en otro puerto:

```javascript
const BACKEND_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';
```

### 3. Abrir la PWA

Simplemente abre `index.html` en tu navegador, o usa un servidor local:

```bash
# Con Python
python -m http.server 8080

# Con Node.js (http-server)
npx http-server -p 8080
```

Luego abre: `http://localhost:8080`

## 📱 Vistas Disponibles

### 1. Home (Selección de Modo)
- Punto de entrada principal
- Selecciona entre Cliente, Conductor o Admin

### 2. Vista Cliente
- Crear pedidos predeterminados
- Editar ubicación de cada pedido
- Ver mapa con punto de entrega
- Usa el controller `/orders` del backend

### 3. Vista Conductor
- Conectar como conductor (ingresar driverId)
- Editar ubicación fake GPS
- Ver mapa con posición actual
- Recibir ofertas de viaje
- Ver ruta sugerida en el mapa
- Aceptar/rechazar ofertas

### 4. Vista Admin
- Dashboard de monitoreo
- Ver todos los conductores en el mapa
- Ver estado de conductores
- Ver pedidos pendientes
- Actualización automática cada 5 segundos

## 🧪 Cómo Probar

### Prueba Completa:

1. **Abrir Vista Cliente**
   - Crear 2-3 pedidos con ubicaciones diferentes
   - Esperar 3 minutos (delay del algoritmo)

2. **Abrir Vista Conductor (múltiples pestañas)**
   - Pestaña 1: Conductor #1, ubicación cerca del restaurante
   - Pestaña 2: Conductor #2, ubicación lejos
   - Cada uno conectado vía WebSocket

3. **Backend procesa**
   - Después de 3 minutos ejecuta algoritmo
   - Asigna pedidos a conductores
   - Envía ofertas vía WebSocket

4. **Conductor recibe oferta**
   - Su página muestra mapa con ruta
   - Botones aceptar/rechazar

5. **Vista Admin**
   - Monitorea todos los conductores
   - Ve pedidos y estados

## 📝 Notas

- **Cliente ID**: Por defecto usa `clienteId: 1`. Ajusta en `js/cliente/ordenes.js` si es necesario.
- **Productos**: Los pedidos usan `productId: 1, 2, 3`. Asegúrate de que existan en la BD.
- **Fake GPS**: Edita las coordenadas manualmente en la vista conductor.
- **Múltiples Conductores**: Abre la PWA en múltiples pestañas, cada una con un `driverId` diferente.

## 🔧 Estructura

```
frontend/
├── index.html              (Página principal)
├── manifest.json           (Configuración PWA)
├── css/
│   └── styles.css          (Estilos)
└── js/
    ├── app.js              (Router)
    ├── api.js              (Llamadas REST)
    ├── map.js              (Google Maps helper)
    ├── cliente/
    │   └── ordenes.js      (Vista cliente)
    ├── conductor/
    │   └── conductor.js    (Vista conductor)
    └── admin/
        └── admin.js        (Vista admin)
```

