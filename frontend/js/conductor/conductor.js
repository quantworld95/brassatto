// Vista Conductor - WebSocket + Mapa
let socket = null;
let driverId = null;
let driverMap = null;
let driverMarker = null;
let currentLocation = { lat: -17.7833, lng: -63.1821 };
let locationInterval = null;
let tripOffer = null;

function initConductorView() {
  const container = document.getElementById('conductor-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">🔌 Conexión</div>
      <div class="input-group">
        <label>ID del Conductor:</label>
        <input type="number" id="driver-id-input" value="1" min="1" placeholder="1">
      </div>
      <button class="btn btn-primary" onclick="conectarConductor()" style="width: 100%;">
        🔌 Conectar
      </button>
      <div id="connection-status" style="margin-top: 10px; font-size: 12px;"></div>
    </div>

    <div class="card" id="location-card" style="display: none;">
      <div class="card-title">📍 Ubicación GPS</div>
      <div style="padding: 10px; background: #1a1a1a; border-radius: 5px; margin-bottom: 15px; font-size: 12px;">
        <strong>ℹ️ Información:</strong> Al hacer clic en "Obtener Ubicación GPS", tu navegador pedirá permiso para acceder a tu ubicación. 
        <strong>Acepta el permiso</strong> para que el sistema pueda obtener tu posición real.
      </div>
      <div class="input-group">
        <label>Latitud:</label>
        <input type="number" id="driver-lat" value="${currentLocation.lat}" step="0.0001">
      </div>
      <div class="input-group">
        <label>Longitud:</label>
        <input type="number" id="driver-lng" value="${currentLocation.lng}" step="0.0001">
      </div>
      <button class="btn btn-primary" onclick="obtenerUbicacionGPS()" style="width: 100%; margin-top: 10px;">
        📍 Obtener Ubicación GPS
      </button>
      <button class="btn btn-secondary" onclick="actualizarUbicacion()" style="width: 100%; margin-top: 10px;">
        🔄 Actualizar Manualmente
      </button>
      <div id="location-status" style="margin-top: 10px; font-size: 12px;"></div>
    </div>

    <div class="card" id="map-card" style="display: none;">
      <div class="card-title">🗺️ Mapa - Posición Actual</div>
      <div class="map-container">
        <div id="driver-map" style="width: 100%; height: 100%;"></div>
      </div>
    </div>

    <div id="trip-offer-container"></div>
  `;

  // No inicializar mapa aquí porque el contenedor está oculto
  // Se inicializará cuando el conductor se conecte
  console.log('📋 Vista de conductor inicializada');
}

function initDriverMap() {
  const mapContainer = document.getElementById('driver-map');
  if (!mapContainer) {
    console.warn('⚠️ Contenedor del mapa no encontrado');
    return;
  }

  // Verificar que el contenedor sea visible
  const mapCard = document.getElementById('map-card');
  if (mapCard && mapCard.style.display === 'none') {
    console.warn('⚠️ El contenedor del mapa está oculto, esperando...');
    setTimeout(() => {
      initDriverMap();
    }, 500);
    return;
  }

  // Verificar que Google Maps esté disponible
  if (!MapHelper.isAvailable()) {
    console.warn('⚠️ Google Maps no está disponible aún, reintentando...');
    setTimeout(() => {
      if (MapHelper.isAvailable()) {
        initDriverMap();
      }
    }, 1000);
    return;
  }

  try {
    console.log('🗺️ Creando mapa en:', currentLocation);
    driverMap = MapHelper.createMap('driver-map', currentLocation, 15);
    
    // Esperar un momento para que el mapa se renderice
    setTimeout(() => {
      driverMarker = MapHelper.addMarker(
        driverMap,
        currentLocation,
        'Tu posición',
        null,
        '🚗'
      );
      console.log('✅ Mapa del conductor inicializado correctamente en:', currentLocation);
      console.log('✅ Marcador creado en:', currentLocation);
    }, 200);
  } catch (error) {
    console.error('❌ Error al inicializar mapa:', error);
  }
}

function conectarConductor() {
  const driverIdInput = document.getElementById('driver-id-input');
  const statusDiv = document.getElementById('connection-status');
  
  driverId = parseInt(driverIdInput.value);
  
  if (!driverId || driverId < 1) {
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Ingresa un ID válido</span>';
    return;
  }

  statusDiv.innerHTML = '<span style="color: #10b981;">⏳ Conectando...</span>';

  // Detectar URL del servidor automáticamente
  const wsUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : `http://${window.location.hostname}:3000`;
  
  console.log('🔌 Conectando WebSocket a:', `${wsUrl}/drivers`);
  
  // Conectar WebSocket
  socket = io(`${wsUrl}/drivers`, {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Conectado al servidor');
    
    // Identificarse como conductor
    socket.emit('driver.connect', { driverId });
    
    statusDiv.innerHTML = '<span style="color: #10b981;">✅ Conectado al servidor</span>';
  });

  socket.on('driver.connected', (data) => {
    console.log('✅ Identificado como conductor:', data);
    statusDiv.innerHTML = `
      <span style="color: #10b981;">
        ✅ Conectado como Conductor #${driverId}
      </span>
    `;
    
    // Mostrar secciones de ubicación y mapa
    document.getElementById('location-card').style.display = 'block';
    document.getElementById('map-card').style.display = 'block';
    
    // Inicializar mapa después de mostrar el card (asegurar que el contenedor sea visible)
    setTimeout(() => {
      if (!driverMap) {
        console.log('🗺️ Inicializando mapa del conductor...');
        initDriverMap();
      } else {
        console.log('🗺️ Mapa ya inicializado, actualizando posición...');
        // Actualizar mapa con la ubicación actual
        if (driverMarker && driverMap) {
          driverMarker.setPosition(currentLocation);
          driverMap.setCenter(currentLocation);
          driverMap.setZoom(15);
        }
      }
      
      // Agregar listeners a los inputs para actualizar mapa en tiempo real
      const latInput = document.getElementById('driver-lat');
      const lngInput = document.getElementById('driver-lng');
      
      if (latInput && lngInput) {
        let updateTimeout = null;
        
        const actualizarMapaEnTiempoReal = () => {
          // Limpiar timeout anterior
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          // Actualizar después de un pequeño delay (para no actualizar en cada tecla)
          updateTimeout = setTimeout(() => {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);
            
            if (!isNaN(lat) && !isNaN(lng) && 
                lat >= -90 && lat <= 90 && 
                lng >= -180 && lng <= 180) {
              
              // Actualizar ubicación temporalmente (sin enviar al servidor)
              const tempLocation = { lat, lng };
              
              // Actualizar marcador si existe
              if (driverMarker && driverMap) {
                driverMarker.setPosition(tempLocation);
                driverMap.setCenter(tempLocation);
                console.log('📍 Mapa actualizado en tiempo real:', tempLocation);
              }
            }
          }, 500); // Delay de 500ms
        };
        
        latInput.addEventListener('input', actualizarMapaEnTiempoReal);
        lngInput.addEventListener('input', actualizarMapaEnTiempoReal);
        console.log('✅ Listeners agregados para actualización en tiempo real del mapa');
      }
    }, 300); // Pequeño delay para asegurar que el DOM esté listo
    
    // Iniciar envío automático de ubicación
    startLocationUpdates();
  });

  socket.on('trip.offer', (offer) => {
    console.log('💌 Oferta recibida:', offer);
    tripOffer = offer;
    showTripOffer(offer);
  });

  socket.on('trip.accepted', (data) => {
    console.log('✅ Oferta aceptada:', data);
    alert('✅ Oferta aceptada exitosamente!');
  });

  socket.on('trip.rejected', (data) => {
    console.log('❌ Oferta rechazada:', data);
  });

  socket.on('error', (error) => {
    console.error('❌ Error:', error);
    statusDiv.innerHTML = `<span style="color: #ef4444;">❌ Error: ${error.message}</span>`;
  });

  socket.on('disconnect', () => {
    console.log('❌ Desconectado');
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Desconectado</span>';
    stopLocationUpdates();
  });
}

function startLocationUpdates() {
  // Intentar obtener ubicación GPS real primero
  obtenerUbicacionGPS();
  
  // Enviar ubicación cada 5 segundos
  locationInterval = setInterval(() => {
    // Intentar obtener GPS real, si falla usa la actual
    obtenerUbicacionGPS(true);
    
    // También actualizar el mapa con la ubicación actual (por si cambió manualmente)
    if (driverMap && driverMarker && currentLocation) {
      driverMarker.setPosition(currentLocation);
      // Solo hacer pan si la diferencia es significativa (más de 10 metros)
      const currentCenter = driverMap.getCenter();
      if (currentCenter) {
        const latDiff = Math.abs(currentCenter.lat() - currentLocation.lat);
        const lngDiff = Math.abs(currentCenter.lng() - currentLocation.lng);
        // Si la diferencia es mayor a ~0.0001 grados (~11 metros), ajustar el mapa
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          driverMap.panTo(currentLocation);
        }
      }
    }
  }, 5000);
}

function stopLocationUpdates() {
  if (locationInterval) {
    clearInterval(locationInterval);
    locationInterval = null;
  }
}

// Verificar estado del permiso de ubicación
async function verificarPermisoUbicacion() {
  if (!navigator.permissions) {
    return 'unknown'; // No soportado, asumir desconocido
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', o 'prompt'
  } catch (error) {
    console.warn('No se pudo verificar permiso:', error);
    return 'unknown';
  }
}

// Obtener ubicación GPS real del dispositivo
async function obtenerUbicacionGPS(silent = false) {
  const statusDiv = document.getElementById('location-status');
  
  if (!navigator.geolocation) {
    if (!silent && statusDiv) {
      statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Geolocalización no soportada en este navegador</span>';
    }
    return;
  }

  // Verificar estado del permiso primero
  const permisoEstado = await verificarPermisoUbicacion();
  
  if (permisoEstado === 'denied') {
    if (!silent && statusDiv) {
      statusDiv.innerHTML = `
        <span style="color: #ef4444;">❌ Permiso de ubicación bloqueado</span>
        <div style="margin-top: 10px; padding: 10px; background: #1a1a1a; border-radius: 5px; font-size: 12px;">
          <strong>🔓 Cómo desbloquear el permiso:</strong><br><br>
          <strong>Chrome/Edge (PC):</strong><br>
          1. Haz clic en el ícono 🔒 o 📍 en la barra de direcciones<br>
          2. Busca "Ubicación" → Cambia a "Permitir"<br>
          3. Recarga la página<br><br>
          
          <strong>Chrome/Edge (Móvil):</strong><br>
          1. Toca los 3 puntos (⋮) → Configuración<br>
          2. Configuración del sitio → Ubicación<br>
          3. Cambia a "Permitir"<br>
          4. Recarga la página<br><br>
          
          <strong>Firefox:</strong><br>
          1. Haz clic en el ícono 🔒 en la barra de direcciones<br>
          2. Permisos → Ubicación → Cambiar a "Permitir"<br>
          3. Recarga la página<br><br>
          
          <strong>O desde Configuración del Navegador:</strong><br>
          Ve a Configuración → Privacidad → Permisos de ubicación → Permite para este sitio<br><br>
          
          <button onclick="location.reload()" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🔄 Recargar página después de cambiar
          </button>
        </div>
      `;
    }
    return;
  }

  if (!silent && statusDiv) {
    if (permisoEstado === 'prompt') {
      statusDiv.innerHTML = `
        <span style="color: #10b981;">⏳ Solicitando permiso de ubicación...</span><br>
        <span style="font-size: 11px; color: #888;">Acepta el popup que aparecerá</span>
      `;
      console.log('⏳ Estado del permiso: prompt - esperando que el usuario acepte');
    } else if (permisoEstado === 'granted') {
      statusDiv.innerHTML = `
        <span style="color: #10b981;">⏳ Obteniendo ubicación GPS...</span><br>
        <span style="font-size: 11px; color: #888;">Permiso concedido, obteniendo coordenadas...</span>
      `;
      console.log('✅ Estado del permiso: granted - obteniendo ubicación');
    } else {
      statusDiv.innerHTML = `
        <span style="color: #10b981;">⏳ Obteniendo ubicación GPS...</span>
      `;
      console.log('⏳ Estado del permiso: unknown - intentando obtener ubicación');
    }
  }

  // Intentar obtener ubicación
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      console.log('✅ Ubicación obtenida exitosamente:', { lat, lng });
      
      currentLocation = { lat, lng };
      
      // Actualizar inputs
      const latInput = document.getElementById('driver-lat');
      const lngInput = document.getElementById('driver-lng');
      if (latInput) {
        latInput.value = lat.toFixed(8);
        console.log('✅ Latitud actualizada en input:', latInput.value);
      }
      if (lngInput) {
        lngInput.value = lng.toFixed(8);
        console.log('✅ Longitud actualizada en input:', lngInput.value);
      }
      
      // Asegurar que el mapa esté inicializado
      if (!driverMap) {
        console.log('🗺️ Mapa no inicializado, inicializando ahora...');
        initDriverMap();
        // Esperar a que se inicialice antes de actualizar
        setTimeout(() => {
          actualizarMapaDesdeGPS();
        }, 500);
      } else {
        actualizarMapaDesdeGPS();
      }
      
      function actualizarMapaDesdeGPS() {
        // Actualizar marcador en el mapa
        if (driverMarker) {
          driverMarker.setPosition(currentLocation);
          console.log('✅ Marcador actualizado desde GPS:', currentLocation);
        } else {
          // Si no hay marcador, crear uno nuevo
          if (driverMap) {
            driverMarker = MapHelper.addMarker(
              driverMap,
              currentLocation,
              'Tu posición',
              null,
              '🚗'
            );
            console.log('✅ Marcador creado desde GPS:', currentLocation);
          }
        }
        
        // Actualizar vista del mapa (zoom y centrar con animación)
        if (driverMap) {
          driverMap.setCenter(currentLocation);
          driverMap.setZoom(15); // Zoom cercano para ver mejor la ubicación
          console.log('✅ Mapa centrado desde GPS en:', currentLocation);
        } else {
          console.warn('⚠️ driverMap no está disponible para actualizar desde GPS');
        }
      }
      
      // Enviar ubicación inmediatamente
      sendLocation();
      
      // Mostrar mensaje de éxito SIEMPRE (incluso si es silent, pero solo si hay statusDiv)
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div style="padding: 15px; background: #10b981; border-radius: 8px; margin-top: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
            <div style="color: white; font-weight: bold; font-size: 16px; margin-bottom: 5px;">
              ¡Ubicación GPS obtenida exitosamente!
            </div>
            <div style="color: rgba(255,255,255,0.9); font-size: 13px;">
              Lat: ${lat.toFixed(6)}<br>
              Lng: ${lng.toFixed(6)}
            </div>
            <div style="color: rgba(255,255,255,0.8); font-size: 11px; margin-top: 8px;">
              La ubicación se actualizará automáticamente cada 5 segundos
            </div>
          </div>
        `;
        console.log('✅ Mensaje de éxito mostrado en pantalla');
        
        // Hacer scroll hacia el mensaje para asegurar que sea visible
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      console.log('📍 Ubicación GPS obtenida:', currentLocation);
    },
    (error) => {
      let errorMsg = '';
      let instructions = '';
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = '❌ Permiso de ubicación bloqueado';
          instructions = `
            <div style="margin-top: 10px; padding: 10px; background: #1a1a1a; border-radius: 5px; font-size: 12px;">
              <strong>🔓 El permiso está bloqueado. Sigue estos pasos:</strong><br><br>
              
              <strong>📱 Chrome/Edge (PC):</strong><br>
              1. Haz clic en el ícono 🔒 o 📍 en la barra de direcciones (izquierda de la URL)<br>
              2. Busca "Ubicación" en la lista<br>
              3. Cambia de "Bloquear" a "Permitir"<br>
              4. Haz clic en "Recargar" o presiona F5<br><br>
              
              <strong>📱 Chrome/Edge (Móvil Android):</strong><br>
              1. Toca los 3 puntos (⋮) en la esquina superior derecha<br>
              2. Ve a "Configuración" → "Configuración del sitio"<br>
              3. Toca "Ubicación"<br>
              4. Cambia a "Permitir"<br>
              5. Recarga la página<br><br>
              
              <strong>📱 Chrome (iOS):</strong><br>
              1. Configuración → Chrome → Ubicación → Permitir<br>
              2. Recarga la página<br><br>
              
              <strong>🦊 Firefox:</strong><br>
              1. Haz clic en el ícono 🔒 en la barra de direcciones<br>
              2. En "Permisos" → "Ubicación" → Cambia a "Permitir"<br>
              3. Recarga la página<br><br>
              
              <strong>🌐 Safari:</strong><br>
              1. Safari → Preferencias → Privacidad<br>
              2. Marca "Servicios de ubicación"<br>
              3. Recarga la página<br><br>
              
              <div style="margin-top: 15px; padding: 10px; background: #2a2a2a; border-radius: 5px;">
                <strong>💡 Alternativa rápida:</strong><br>
                Puedes escribir las coordenadas manualmente en los campos de arriba y hacer clic en <strong>"Actualizar Manualmente"</strong>.<br>
                La ubicación se enviará al servidor igual que si fuera GPS automático.
              </div><br>
              
              <button onclick="location.reload()" style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                🔄 Recargar página (después de cambiar el permiso)
              </button>
            </div>
          `;
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = '❌ Ubicación no disponible';
          instructions = '<div style="margin-top: 10px; font-size: 12px;">Asegúrate de que el GPS esté activado en tu dispositivo.</div>';
          break;
        case error.TIMEOUT:
          errorMsg = '⏱️ Tiempo de espera agotado';
          instructions = `
            <div style="margin-top: 10px; font-size: 12px;">
              El GPS está tardando demasiado. Intenta nuevamente.<br>
              <button onclick="obtenerUbicacionGPS()" style="margin-top: 5px; padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                🔄 Reintentar
              </button>
            </div>
          `;
          break;
        default:
          errorMsg = '❌ Error desconocido al obtener ubicación';
          instructions = '<div style="margin-top: 10px; font-size: 12px;">Intenta recargar la página o usar la actualización manual.</div>';
          break;
      }
      
      if (!silent && statusDiv) {
        statusDiv.innerHTML = `
          <span style="color: #ef4444;">${errorMsg}</span>
          ${instructions}
        `;
      }
      
      console.error('❌ Error GPS:', error);
    },
    {
      enableHighAccuracy: true, // Usar GPS de alta precisión
      timeout: 15000, // 15 segundos de timeout (más tiempo para móviles)
      maximumAge: 0 // No usar ubicación cacheada
    }
  );
  
  console.log('📍 Solicitud de ubicación GPS enviada, esperando respuesta...');
}

// Actualizar ubicación manualmente (fallback)
function actualizarUbicacion() {
  const latInput = document.getElementById('driver-lat');
  const lngInput = document.getElementById('driver-lng');
  const statusDiv = document.getElementById('location-status');

  // Obtener y limpiar valores
  const latStr = latInput.value.trim();
  const lngStr = lngInput.value.trim();

  // Validar que no estén vacíos
  if (!latStr || !lngStr) {
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Ingresa coordenadas válidas</span>';
    return;
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  // Validar que sean números válidos
  if (isNaN(lat) || isNaN(lng)) {
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Las coordenadas deben ser números válidos</span>';
    return;
  }

  // Validar rango de coordenadas
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Coordenadas fuera de rango válido (Lat: -90 a 90, Lng: -180 a 180)</span>';
    return;
  }

  // Actualizar ubicación actual
  currentLocation = { lat, lng };
  
  console.log('📍 Actualizando ubicación manualmente:', currentLocation);
  
  // Función para actualizar el mapa visualmente
  function actualizarMapaVisual() {
    console.log('🗺️ Actualizando mapa visualmente...');
    
    // Asegurar que el mapa esté inicializado
    if (!driverMap) {
      console.log('⚠️ Mapa no inicializado, inicializando...');
      initDriverMap();
      // Esperar a que se inicialice
      setTimeout(() => {
        actualizarMapaVisual();
      }, 500);
      return;
    }
    
    // Actualizar o crear marcador
    if (driverMarker) {
      // Actualizar posición del marcador existente
      driverMarker.setPosition(currentLocation);
      console.log('✅ Marcador actualizado en:', currentLocation);
    } else {
      // Crear nuevo marcador si no existe
      try {
        driverMarker = MapHelper.addMarker(
          driverMap,
          currentLocation,
          'Tu posición',
          null,
          '🚗'
        );
        console.log('✅ Marcador creado en:', currentLocation);
      } catch (error) {
        console.error('❌ Error al crear marcador:', error);
      }
    }
    
    // Actualizar vista del mapa (centrar y zoom)
    try {
      driverMap.setCenter(currentLocation);
      driverMap.setZoom(15);
      console.log('✅ Mapa centrado y ajustado en:', currentLocation);
    } catch (error) {
      console.error('❌ Error al actualizar vista del mapa:', error);
    }
  }
  
  // Ejecutar actualización del mapa
  actualizarMapaVisual();
  
  // Enviar ubicación al WebSocket (que la guardará en Redis)
  const enviado = sendLocation();
  
  // Mostrar mensaje de éxito
  if (statusDiv) {
    if (enviado) {
      statusDiv.innerHTML = `
        <div style="padding: 15px; background: #8b5cf6; border-radius: 8px; margin-top: 10px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
          <div style="color: white; font-weight: bold; font-size: 16px; margin-bottom: 5px;">
            ¡Ubicación actualizada manualmente!
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 13px;">
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}
          </div>
          <div style="color: rgba(255,255,255,0.8); font-size: 11px; margin-top: 8px;">
            ✅ Enviada al servidor y guardada en Redis
          </div>
        </div>
      `;
      console.log('✅ Ubicación manual actualizada y enviada al servidor');
    } else {
      statusDiv.innerHTML = `
        <div style="padding: 15px; background: #f59e0b; border-radius: 8px; margin-top: 10px; text-align: center;">
          <div style="color: white; font-weight: bold; font-size: 14px; margin-bottom: 5px;">
            ⚠️ Ubicación actualizada localmente
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 12px;">
            Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}<br>
            <span style="font-size: 11px;">No conectado al servidor. Conecta primero como conductor.</span>
          </div>
        </div>
      `;
      console.warn('⚠️ Ubicación actualizada pero no enviada (no hay conexión WebSocket)');
    }
    
    // Hacer scroll hacia el mensaje
    statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function sendLocation() {
  if (!socket || !socket.connected) {
    console.warn('⚠️ No hay conexión WebSocket, no se puede enviar ubicación');
    return false;
  }

  socket.emit('driver.location', {
    lat: currentLocation.lat,
    lng: currentLocation.lng,
  });

  console.log('📍 Ubicación enviada al servidor:', currentLocation);
  return true; // Indica que se envió correctamente
}

function showTripOffer(offer) {
  const container = document.getElementById('trip-offer-container');
  if (!container) return;

  // Crear puntos para la ruta
  const routePoints = [
    offer.restaurant.coordinates,
    ...offer.stops.map(stop => stop.coordinates || stop),
  ];

  container.innerHTML = `
    <div class="trip-offer">
      <h3>💌 NUEVA OFERTA RECIBIDA</h3>
      
      <div class="trip-info">
        <div class="trip-info-item">
          <div class="label">Pedidos</div>
          <div class="value">${offer.summary.totalOrders}</div>
        </div>
        <div class="trip-info-item">
          <div class="label">Distancia</div>
          <div class="value">${offer.summary.totalDistanceKm.toFixed(2)} km</div>
        </div>
        <div class="trip-info-item">
          <div class="label">Tiempo</div>
          <div class="value">${offer.summary.estimatedTimeMinutes.toFixed(0)} min</div>
        </div>
        <div class="trip-info-item">
          <div class="label">Ganancia</div>
          <div class="value">Bs ${offer.summary.estimatedEarnings.toFixed(2)}</div>
        </div>
      </div>

      <div class="map-container">
        <div id="trip-map" style="width: 100%; height: 100%;"></div>
      </div>

      <div class="trip-actions">
        <button class="btn btn-primary" onclick="aceptarOferta('${offer.offerId}')">
          ✅ ACEPTAR
        </button>
        <button class="btn btn-danger" onclick="rechazarOferta('${offer.offerId}')">
          ❌ RECHAZAR
        </button>
      </div>
    </div>
  `;

  // Inicializar mapa con ruta
  setTimeout(() => {
    initTripMap(offer, routePoints);
  }, 100);
}

function initTripMap(offer, routePoints) {
  const map = MapHelper.createMap('trip-map', routePoints[0], 13);

  // Agregar marcador del restaurante
  MapHelper.addMarker(
    map,
    offer.restaurant.coordinates,
    offer.restaurant.name,
    null,
    '🏪'
  );

  // Agregar marcadores de destinos
  offer.stops.forEach((stop, index) => {
    const coords = stop.coordinates || stop;
    MapHelper.addMarker(
      map,
      coords,
      `Cliente ${index + 1}: ${stop.address || 'Dirección'}`,
      null,
      (index + 1).toString()
    );
  });

  // Agregar marcador del conductor
  if (currentLocation) {
    MapHelper.addMarker(
      map,
      currentLocation,
      'Tu posición',
      null,
      '🚗'
    );
  }

  // Dibujar ruta
  MapHelper.drawRoute(map, routePoints, '#8b5cf6');

  // Ajustar vista
  MapHelper.fitBounds(map, routePoints);
}

function aceptarOferta(offerId) {
  if (!socket || !socket.connected) {
    alert('❌ No estás conectado');
    return;
  }

  socket.emit('trip.accept', { offerId });
  console.log('✅ Oferta aceptada:', offerId);
}

function rechazarOferta(offerId) {
  if (!socket || !socket.connected) {
    alert('❌ No estás conectado');
    return;
  }

  socket.emit('trip.reject', { offerId });
  console.log('❌ Oferta rechazada:', offerId);
  
  // Limpiar oferta
  document.getElementById('trip-offer-container').innerHTML = '';
  tripOffer = null;
}

// Exportar para uso global
window.initConductorView = initConductorView;
window.conectarConductor = conectarConductor;
window.obtenerUbicacionGPS = obtenerUbicacionGPS;
window.actualizarUbicacion = actualizarUbicacion;
window.aceptarOferta = aceptarOferta;
window.rechazarOferta = rechazarOferta;

