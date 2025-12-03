# 🔴 Configuración de Redis

## Variables de Entorno

Agrega estas líneas a tu archivo `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Instalación de Redis

### Opción 1: Docker (Recomendado)

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Opción 2: Instalación Local

**Windows:**
- Descargar de: https://github.com/microsoftarchive/redis/releases
- O usar WSL2 con Redis

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Mac:**
```bash
brew install redis
brew services start redis
```

---

## Verificar que Redis está corriendo

```bash
# Probar conexión
redis-cli ping
# Debe responder: PONG
```

---

## Uso en el Sistema

### Flujo de Ubicación en Tiempo Real:

1. **App Móvil del Conductor:**
   ```javascript
   // Al conectarse
   socket.emit('driver.connect', { driverId: 5 });
   
   // Cada 5-10 segundos
   socket.emit('driver.location', { 
     lat: -17.7833, 
     lng: -63.1821 
   });
   ```

2. **Backend guarda en Redis:**
   ```
   Key: "driver:5:location"
   Value: {"lat":-17.7833,"lng":-63.1821,"timestamp":1701432000000}
   TTL: 60 segundos
   ```

3. **DriverSelectionService lee de Redis:**
   - Si existe → usa posición actualizada
   - Si no existe → fallback a BD

---

## Monitoreo

### Ver todas las ubicaciones en Redis:

```bash
redis-cli
> KEYS driver:*:location
> GET driver:5:location
```

---

## Troubleshooting

### Error: "ECONNREFUSED"
- Redis no está corriendo
- Verificar: `redis-cli ping`

### Error: "Connection timeout"
- Verificar REDIS_HOST y REDIS_PORT en .env
- Verificar firewall

### No se guardan ubicaciones
- Verificar que el Gateway recibe eventos `driver.location`
- Verificar logs del backend

---

## Notas

- Redis es opcional: si no está disponible, el sistema usa BD como fallback
- TTL de 60 seg: si el conductor no actualiza, la posición expira
- Redis se reinicia limpio: no persiste datos (a menos que configures persistencia)

