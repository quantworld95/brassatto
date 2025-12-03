# 🗺️ Guía Completa: Configurar Google Maps API

## 📋 Antes de Empezar

**Necesitas:**
- ✅ Cuenta de Google (Gmail)
- ✅ Tarjeta de crédito/débito para verificación
- ⏱️ Tiempo estimado: 10-15 minutos

**Costo:**
- 🎁 **$200 USD gratis cada mes**
- 💰 Solo pagas si excedes $200/mes (poco probable en desarrollo)

---

## 🚀 PASO 1: Acceder a Google Cloud Console

1. Abre tu navegador
2. Ve a: **https://console.cloud.google.com/**
3. Inicia sesión con tu cuenta de Google

**Si es tu primera vez:**
- Clic en "Comenzar" o "Get Started"
- Aceptar términos y condiciones
- Seleccionar tu país
- Clic en "Continuar"

---

## 🏗️ PASO 2: Crear un Proyecto

### 2.1 Seleccionar/Crear Proyecto

En la barra superior verás algo como: **"My First Project"** o **"Select a project"**

1. Clic en el nombre del proyecto (o botón de selección)
2. En el modal que aparece, clic en **"NEW PROJECT"** (arriba a la derecha)

### 2.2 Configurar el Proyecto

```
Project name: food-delivery-bot
           (o el nombre que prefieras)

Organization: No organization
           (déjalo por defecto si no tienes)

Location: No organization
           (déjalo por defecto)
```

3. Clic en **"CREATE"**
4. Espera 10-20 segundos mientras se crea
5. Se abrirá automáticamente el proyecto

---

## 🔌 PASO 3: Habilitar Distance Matrix API

### 3.1 Ir al Catálogo de APIs

En el menú lateral izquierdo (☰):
1. Clic en **"APIs & Services"**
2. Clic en **"Library"** (Biblioteca)

### 3.2 Buscar y Habilitar Distance Matrix API

1. En la barra de búsqueda, escribe: **"Distance Matrix"**
2. Clic en **"Distance Matrix API"** (de los resultados)
3. Verás una página con información de la API
4. Clic en el botón azul **"ENABLE"** (Habilitar)
5. Espera que se active (~10 segundos)

✅ Verás "API enabled" cuando esté lista

### 3.3 (Opcional) Habilitar Directions API

Repite el proceso anterior para **"Directions API"** (para futuras funcionalidades)

---

## 🔑 PASO 4: Crear API Key

### 4.1 Ir a Credenciales

1. En el menú lateral: **APIs & Services** → **Credentials**
2. Arriba verás un botón **"+ CREATE CREDENTIALS"**
3. Clic en ese botón
4. Selecciona **"API key"**

### 4.2 Copiar la API Key

Aparecerá un modal con tu API Key:

```
Your API key
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

⚠️ COPIA ESTA KEY AHORA
```

**MUY IMPORTANTE:** 
- Copia esta key y guárdala en un lugar seguro
- La necesitarás en el siguiente paso

---

## 🔒 PASO 5: Restringir la API Key (Seguridad)

### 5.1 Configurar Restricciones

Después de crear la key, verás un botón **"RESTRICT KEY"** o puedes:

1. Ir a **Credentials**
2. Clic en tu API key (en la lista)
3. Configurar:

#### Restricción de API:
```
☑ Restrict key

APIs seleccionadas:
  ✅ Distance Matrix API
  ✅ Directions API (si la habilitaste)
```

#### Restricción de Aplicación (Opcional - para producción):
```
• None (para desarrollo local)

O para producción:
• IP addresses
  Agregar: Tu IP del servidor
```

4. Clic en **"SAVE"** al final de la página

---

## ⚙️ PASO 6: Configurar en tu Proyecto

### 6.1 Abrir el archivo .env

En tu proyecto, abre: `backend/.env`

Si no existe, créalo basándote en `.env.example`

### 6.2 Agregar la API Key

```env
# Tu configuración existente (no tocar)
DATABASE_URL="postgresql://..."

# Agregar esta línea con tu API Key
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Reemplaza** `AIzaSy...` con tu key real que copiaste

### 6.3 Guardar el archivo

⚠️ **Importante:** 
- NO subas este archivo a Git
- Asegúrate de que `.env` está en `.gitignore`

---

## ✅ PASO 7: Verificar que Funciona

### 7.1 Ejecutar el test

Abre tu terminal en la carpeta del proyecto:

```bash
cd backend
npx ts-node scripts/test-full-assignment.ts
```

### 7.2 Resultados Esperados

Si está configurado correctamente:

```
🔑 Verificando configuración de Google Maps API...

   ✅ Google Maps API configurada
   💰 Costo estimado: $0.005/elemento

📦 FASE A: CLUSTERING DE PEDIDOS
   ...

🚗 FASE B: SELECCIÓN DE CONDUCTORES
   ...

🗺️  FASE C: OPTIMIZACIÓN DE RUTAS (TSP con Google Maps)
   ⏳ Consultando Google Distance Matrix API...
   ✅ Batch ... optimizado
   ...
```

### 7.3 Si hay Errores

#### Error: "API key not configured"
```bash
❌ ERROR: GOOGLE_MAPS_API_KEY no configurada
```
**Solución:** 
- Verifica que el `.env` existe
- Verifica que la variable está escrita correctamente
- Reinicia el script

#### Error: "API not enabled"
```bash
Error: Google Distance Matrix API error: NOT_ENABLED
```
**Solución:**
- Ve a Google Cloud Console
- Habilita "Distance Matrix API"
- Espera 2-3 minutos y reintenta

#### Error: "REQUEST_DENIED"
```bash
Error: Google Distance Matrix API error: REQUEST_DENIED
```
**Solución:**
- Verifica que la API key es correcta
- Verifica que no tiene restricciones demasiado estrictas
- Intenta crear una nueva key sin restricciones (solo para probar)

---

## 💰 PASO 8: Monitorear Uso y Costos

### 8.1 Ver Dashboard de Uso

1. En Google Cloud Console
2. Menú lateral: **APIs & Services** → **Dashboard**
3. Verás gráficas de uso de tus APIs

### 8.2 Configurar Alertas de Presupuesto

1. Menú lateral: **Billing** → **Budgets & alerts**
2. Clic en **"CREATE BUDGET"**
3. Configurar:
   ```
   Budget amount: $10 USD (o lo que prefieras)
   Alert thresholds: 50%, 90%, 100%
   ```

**Recibirás emails** cuando te acerques al límite

---

## 🎓 Resumen de URLs Importantes

| Recurso | URL |
|---------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| APIs Library | https://console.cloud.google.com/apis/library |
| Credentials | https://console.cloud.google.com/apis/credentials |
| Billing | https://console.cloud.google.com/billing |
| Documentación Distance Matrix | https://developers.google.com/maps/documentation/distance-matrix |

---

## 🆘 ¿Problemas?

Si tienes algún error que no puedes resolver:

1. Verifica que seguiste todos los pasos
2. Revisa los logs del error en la terminal
3. Verifica en Google Cloud Console que la API está habilitada
4. Intenta crear una nueva API Key
5. Espera 5 minutos después de habilitar las APIs

---

## 🎉 ¡Listo!

Una vez que veas:
```
✅ Google Maps API configurada
```

Ya puedes usar la FASE C del algoritmo de asignación con rutas reales optimizadas. 🚀

