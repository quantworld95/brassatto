# Flujo Completo: Pedido → Oferta Aceptada

## 📋 Resumen del Flujo

Este documento describe el flujo completo desde que un cliente crea un pedido hasta que un conductor acepta la oferta de entrega, incluyendo todas las comunicaciones entre frontend y backend.

---

## 🔄 PASO 1: Cliente Crea Pedido

**Frontend:**
- **Método:** `POST /orders` (REST API)
- **Archivo:** `frontend/js/api.js` línea 17
- **Datos enviados:**
  ```json
  {
    "clienteId": 1,
    "items": [...],
    "latitude": -17.7833,
    "longitude": -63.1821,
    "address": "Coordenadas"
  }
  ```

**Backend:**
- **Servicio:** `OrderService.createOrder()`
- **Acción:** Crea pedido con estado `READY_FOR_PICKUP`
- **Evento emitido:** `order.ready_for_pickup` (con `orderId`)

---

## 🔄 PASO 2: Orchestrator Recibe Evento

**Backend:**
- **Listener:** `@OnEvent('order.ready_for_pickup')`
- **Archivo:** `AssignmentOrchestratorService.onOrderReady()`
- **Acción:** Programa procesamiento con delay de **3 minutos (180s)**
- **Nota:** Si ya hay procesamiento programado, ignora (el pedido se incluirá en el próximo ciclo)

---

## 🔄 PASO 3: Conductor Se Conecta (Paralelo)

**Frontend:**
- **Método:** `io('/drivers').emit('driver.connect', { driverId })` (WebSocket)
- **Archivo:** `frontend/js/conductor/conductor.js` línea 143

**Backend:**
- **Handler:** `OfferGateway.handleDriverConnect()` (línea 99)
- **Acciones:**
  - Actualiza estado del conductor a `DISPONIBLE`
  - Inicializa ubicación en Redis desde BD
  - Responde: `driver.connected`

---

## 🔄 PASO 4: Conductor Envía Ubicación (Continuo)

**Frontend:**
- **Método:** `socket.emit('driver.location', { lat, lng })` (WebSocket, cada 5 segundos)
- **Archivo:** `frontend/js/conductor/conductor.js` línea 698

**Backend:**
- **Handler:** `OfferGateway.handleLocationUpdate()` (línea 146)
- **Acción:** Guarda en Redis con key `driver:{id}:location` (TTL 5 min)

---

## 🔄 PASO 5: Ejecución del Algoritmo (Después del Delay)

**Backend:**
- **Método:** `AssignmentOrchestratorService.runAlgorithm()` (línea 96)

**Fases ejecutadas:**

### FASE A: Clustering
- Agrupa pedidos cercanos geográficamente
- Crea `BatchProposal` para cada grupo

### FASE B: Selección de Conductores
- Obtiene conductores disponibles desde BD
- **Lee ubicaciones en tiempo real desde Redis** (fallback a BD)
- Calcula ETA y score para cada conductor
- Asigna batches a conductores usando estrategia greedy

### FASE C: Optimización de Rutas
- Usa Google Maps Distance Matrix API
- Optimiza secuencia de entregas (TSP)
- Genera `OptimizedStop[]` con orden óptimo

### FASE D: Creación de Ofertas
- Crea `TripOffer` con toda la información
- **Evento emitido:** `offer.created`

---

## 🔄 PASO 6: Gateway Envía Oferta al Conductor

**Backend:**
- **Evento:** `offer.created` (línea 114 en `offer.service.ts`)
- **Gateway:** `OfferGateway` escucha y envía vía WebSocket
- **WebSocket:** `trip.offer` → Conductor recibe oferta completa
- **Archivo:** `offer.gateway.ts` línea 269

---

## 🔄 PASO 7: Conductor Recibe Oferta

**Frontend:**
- **Listener:** `socket.on('trip.offer', (offer) => ...)` (WebSocket)
- **Archivo:** `frontend/js/conductor/conductor.js` línea 220
- **Acción:** Muestra tarjeta con:
  - ✅ Resumen (pedidos, distancia, tiempo, ganancia)
  - ✅ Restaurante (punto de recogida)
  - ✅ Secuencia de entregas numerada
  - ✅ Botones Aceptar/Rechazar

---

## 🔄 PASO 8: Conductor Acepta Oferta

**Frontend:**
- **Método:** `socket.emit('trip.accept', { offerId })` (WebSocket)
- **Archivo:** `frontend/js/conductor/conductor.js` línea 948

**Backend:**
- **Handler:** `OfferGateway.handleOfferAccepted()` (línea 199)
- **Evento emitido:** `driver.offer_accepted` (línea 212)

---

## 🔄 PASO 9: Persistencia en BD

**Backend:**
- **Listener:** `@OnEvent('driver.offer_accepted')`
- **Archivo:** `AssignmentOrchestratorService.onOfferAccepted()` (línea 184)
- **Servicio:** `PersistenceService.persistAcceptedOffer()` (línea 198)

**Acciones (en transacción atómica):**
1. ✅ Crea `DeliveryBatch` en BD
2. ✅ Crea `DeliveryStop` (uno por pedido, en orden optimizado)
3. ✅ Actualiza conductor a estado `OCUPADO`

---

## 🔄 PASO 10: Confirmación al Conductor

**Backend:**
- **Método:** `client.emit('trip.accepted', { offerId, message })` (WebSocket)
- **Archivo:** `offer.gateway.ts` línea 215

**Frontend:**
- **Listener:** `socket.on('trip.accepted', (data) => ...)` (WebSocket)
- **Archivo:** `frontend/js/conductor/conductor.js` línea 226
- **Acción:** Muestra mensaje de éxito y luego mapa con ruta completa

---

## 📊 Resumen de Comunicaciones

| Paso | Frontend → Backend | Backend → Frontend | Tipo |
|------|-------------------|-------------------|------|
| 1. Crear pedido | `POST /orders` | `200 OK` | REST API |
| 3. Conectar conductor | `driver.connect` | `driver.connected` | WebSocket |
| 4. Ubicación conductor | `driver.location` (cada 5s) | - | WebSocket |
| 6. Recibir oferta | - | `trip.offer` | WebSocket |
| 8. Aceptar oferta | `trip.accept` | `trip.accepted` | WebSocket |
| 8. Rechazar oferta | `trip.reject` | `trip.rejected` | WebSocket |

---

## 🔔 Eventos Internos del Backend

| Evento | Origen | Destino | Acción |
|--------|--------|---------|--------|
| `order.ready_for_pickup` | OrderService | Orchestrator | Programa procesamiento |
| `offer.created` | OfferService | Gateway | Envía oferta vía WebSocket |
| `driver.offer_accepted` | Gateway | Orchestrator | Inicia persistencia |
| `driver.offer_rejected` | Gateway | Orchestrator | Limpia oferta |

---

## 🗺️ Flujo Visual Completo

```
┌─────────────┐
│   CLIENTE   │
└──────┬──────┘
       │ 1. POST /orders (REST)
       ↓
┌─────────────┐
│   BACKEND   │
│ OrderService│
└──────┬──────┘
       │ 2. EVENTO: order.ready_for_pickup
       ↓
┌─────────────┐
│ Orchestrator│ → Programa delay 3 min
└──────┬──────┘
       │
       │ (Paralelo)
       │
┌─────────────┐
│  CONDUCTOR  │
│  Frontend   │
└──────┬──────┘
       │ 3. driver.connect (WebSocket)
       ↓
┌─────────────┐
│   Gateway   │ → Estado: DISPONIBLE
└──────┬──────┘
       │ 4. driver.location (cada 5s)
       ↓
┌─────────────┐
│    Redis    │ → Guarda ubicación
└─────────────┘
       │
       │ (Después de 3 min)
       ↓
┌─────────────┐
│ Orchestrator│ → runAlgorithm()
└──────┬──────┘
       │ FASE A: Clustering
       │ FASE B: Selección (lee Redis)
       │ FASE C: Optimización
       │ FASE D: Crear oferta
       ↓
┌─────────────┐
│ OfferService│ → EVENTO: offer.created
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Gateway   │ → trip.offer (WebSocket)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  CONDUCTOR  │ → Ve oferta card
│  Frontend   │
└──────┬──────┘
       │ 5. trip.accept (WebSocket)
       ↓
┌─────────────┐
│   Gateway   │ → EVENTO: driver.offer_accepted
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Orchestrator│ → Llama PersistenceService
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Persistence │ → Guarda en BD:
│   Service   │   - DeliveryBatch
│             │   - DeliveryStops
│             │   - Conductor OCUPADO
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Gateway   │ → trip.accepted (WebSocket)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  CONDUCTOR  │ → Ve mapa con ruta
│  Frontend   │
└─────────────┘
```

---

## 🔑 Puntos Clave

1. **Delay de 3 minutos:** Permite acumular pedidos antes de procesar
2. **Ubicación en tiempo real:** Se lee desde Redis durante la selección
3. **Transacción atómica:** La persistencia es todo-o-nada
4. **Separación de responsabilidades:** Backend solo emite eventos, frontend maneja UI
5. **WebSocket para tiempo real:** Ofertas y ubicaciones en tiempo real
6. **REST API para operaciones:** Creación de pedidos usa REST

---

## 📝 Notas Técnicas

- **Redis TTL:** 5 minutos para ubicaciones de conductores
- **Delay configurable:** `ORCHESTRATOR_CONFIG.processingDelaySeconds` (180s)
- **Estado del conductor:** Cambia automáticamente (DISPONIBLE → OCUPADO)
- **Fallback:** Si Redis falla, usa BD para ubicaciones

---

*Última actualización: Generado automáticamente*

