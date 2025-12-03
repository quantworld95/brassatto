# 🗺️ Configuración de Google Maps API

## 📋 Requisitos

Para usar la **FASE C** (optimización de rutas), necesitas configurar Google Maps API.

---

## 🔑 Paso 1: Obtener API Key

### 1. Ir a Google Cloud Console
👉 https://console.cloud.google.com/

### 2. Crear un proyecto (si no tienes uno)
- Clic en "Select a project" → "New Project"
- Nombre: `food-delivery` (o el que prefieras)
- Clic en "Create"

### 3. Habilitar APIs necesarias
- Ir a "APIs & Services" → "Library"
- Buscar y habilitar:
  - ✅ **Distance Matrix API** (obligatorio)
  - ✅ **Directions API** (opcional, para futuro)

### 4. Crear API Key
- Ir a "APIs & Services" → "Credentials"
- Clic en "Create Credentials" → "API Key"
- Copiar la API Key generada

### 5. (Recomendado) Restringir la API Key
- Clic en la API Key creada
- En "API restrictions":
  - Seleccionar "Restrict key"
  - Marcar solo las APIs que habilitaste
- En "Application restrictions" (opcional):
  - Seleccionar "IP addresses"
  - Agregar tu IP del servidor

---

## ⚙️ Paso 2: Configurar en el Proyecto

### Agregar al archivo `.env`:

```env
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Ubicación:** `backend/.env`

---

## 💰 Costos

Google Maps ofrece **$200 USD de crédito gratis** cada mes.

### Distance Matrix API:
- **$5 USD** por 1,000 elementos
- 1 elemento = 1 origen × 1 destino

### Ejemplo de uso:
```
Batch con 3 clientes:
- Puntos: Restaurante + 3 clientes = 4 puntos
- Matriz: 4 × 4 = 16 elementos
- Costo: $0.08 por batch

Si procesas 100 batches/día = $8/día = $240/mes
```

**El crédito gratis de $200/mes cubre ~25 batches/día**

---

## 🧪 Verificar Configuración

### Ejecutar test completo:

```bash
npx ts-node scripts/test-full-assignment.ts
```

Si la API Key está configurada correctamente, verás:
```
✅ Google Maps API configurada
💰 Costo estimado: $0.005/elemento
```

Si hay error:
```
❌ ERROR: GOOGLE_MAPS_API_KEY no configurada
```

---

## 🚨 Troubleshooting

### Error: "API key not configured"
- Verifica que el archivo `.env` existe en `backend/`
- Verifica que la variable se llama exactamente `GOOGLE_MAPS_API_KEY`
- Reinicia el script después de modificar `.env`

### Error: "API not enabled"
- Ve a Google Cloud Console
- Habilita "Distance Matrix API"
- Espera 1-2 minutos para que se active

### Error: "REQUEST_DENIED"
- Verifica las restricciones de la API Key
- Asegúrate de que la Distance Matrix API está habilitada
- Verifica que tu IP no está bloqueada

---

## 🔄 Alternativa MVP (sin Google API)

Si no quieres usar Google Maps API de momento, puedes:

1. Comentar/modificar el `RouteOptimizerService` para usar Haversine
2. La FASE A y FASE B funcionan sin Google API
3. Solo FASE C requiere la API

---

## 📚 Documentación Oficial

- [Distance Matrix API](https://developers.google.com/maps/documentation/distance-matrix)
- [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

