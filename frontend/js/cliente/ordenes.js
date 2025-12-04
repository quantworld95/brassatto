// Vista Cliente - Crear órdenes
// ============================================

// 1. ÓRDENES PREDEFINIDAS
// Cada orden tiene un clienteId diferente (IDs de la tabla clientes)
const ordenesPredefinidas = [
  {
    id: 1,
    nombre: 'Pedido 1 - Pizza',
    clienteId: 28, // Cliente Uno (id: 28, usuarioId: 68)
    items: [{ productId: 1, quantity: 1, sideDishIds: [] }],
    total: 50.00,
    lat: -17.7833,
    lng: -63.1821,
  },
  {
    id: 2,
    nombre: 'Pedido 2 - Hamburguesa',
    clienteId: 29, // Cliente Dos (id: 29, usuarioId: 69)
    items: [{ productId: 2, quantity: 1, sideDishIds: [] }],
    total: 75.00,
    lat: -17.7900,
    lng: -63.1900,
  },
  {
    id: 3,
    nombre: 'Pedido 3 - Combo',
    clienteId: 30, // Cliente Tres (id: 30, usuarioId: 70)
    items: [{ productId: 3, quantity: 1, sideDishIds: [] }],
    total: 100.00,
    lat: -17.7850,
    lng: -63.1850,
  },
];

// 2. INICIALIZAR VISTA
function initClienteView() {
  const container = document.getElementById('ordenes-container');
  if (!container) {
    console.error('❌ No se encontró el contenedor #ordenes-container');
    return;
  }

  container.innerHTML = '<h2>📦 Crear Pedidos</h2>';

  // Mostrar cada orden predefinida
  ordenesPredefinidas.forEach(orden => {
    const card = crearCardOrden(orden);
    container.appendChild(card);
  });
  
  console.log(`✅ Vista cliente inicializada con ${ordenesPredefinidas.length} órdenes`);
}

// 3. CREAR CARD DE ORDEN
function crearCardOrden(orden) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '20px';

  card.innerHTML = `
    <h3>${orden.nombre}</h3>
    <p><strong>Total: Bs ${orden.total.toFixed(2)}</strong></p>
    
    <div class="input-group">
      <label>📍 Latitud:</label>
      <input type="number" 
             id="lat-${orden.id}" 
             placeholder="Ej: -17.7833"
             step="0.0001">
    </div>
    
    <div class="input-group">
      <label>📍 Longitud:</label>
      <input type="number" 
             id="lng-${orden.id}" 
             placeholder="Ej: -63.1821"
             step="0.0001">
    </div>
    
    <div class="map-container">
      <div id="map-orden-${orden.id}" style="width: 100%; height: 300px;"></div>
    </div>
    
    <button class="btn btn-primary" onclick="crearPedido(${orden.id})" style="width: 100%; margin-top: 15px;">
      ✅ CREAR PEDIDO
    </button>
    
    <div id="status-${orden.id}" style="margin-top: 10px;"></div>
  `;

  // Inicializar mapa vacío (sin coordenadas por defecto)
  // Esperar a que Google Maps esté disponible
  setTimeout(() => {
    if (typeof google !== 'undefined' && google.maps) {
      inicializarMapaVacio(orden.id);
    } else {
      console.warn('⚠️ Google Maps no está disponible aún, reintentando...');
      setTimeout(() => {
        if (typeof google !== 'undefined' && google.maps) {
          inicializarMapaVacio(orden.id);
        }
      }, 500);
    }
  }, 200);

  return card;
}

// 4. INICIALIZAR MAPA
const mapas = {}; // { ordenId: mapa }
const marcadores = {}; // { ordenId: marcador }

// Inicializar mapa vacío (sin coordenadas por defecto)
function inicializarMapaVacio(ordenId) {
  const mapContainer = document.getElementById(`map-orden-${ordenId}`);
  if (!mapContainer) {
    console.error(`❌ No se encontró el contenedor del mapa para orden ${ordenId}`);
    return;
  }

  // Verificar que Google Maps esté disponible
  if (typeof google === 'undefined' || !google.maps) {
    console.error('❌ Google Maps no está disponible');
    return;
  }

  // Crear mapa centrado en Santa Cruz (vista general, sin marcador)
  const centroSantaCruz = { lat: -17.8146, lng: -63.1561 };
  const mapa = MapHelper.createMap(`map-orden-${ordenId}`, centroSantaCruz, 12);
  mapas[ordenId] = mapa;

  // Configurar listeners para actualizar mapa cuando se ingresen coordenadas
  const latInput = document.getElementById(`lat-${ordenId}`);
  const lngInput = document.getElementById(`lng-${ordenId}`);

  function actualizarMapa() {
    const nuevaLat = parseFloat(latInput.value);
    const nuevaLng = parseFloat(lngInput.value);

    if (!isNaN(nuevaLat) && !isNaN(nuevaLng)) {
      const nuevaPosicion = { lat: nuevaLat, lng: nuevaLng };
      
      // Mover mapa
      if (mapas[ordenId]) {
        mapas[ordenId].panTo(nuevaPosicion);
        mapas[ordenId].setZoom(15);
      }
      
      // Crear o actualizar marcador
      if (marcadores[ordenId]) {
        marcadores[ordenId].setPosition(nuevaPosicion);
      } else {
        // Crear marcador si no existe
        const marcador = MapHelper.addMarker(mapas[ordenId], nuevaPosicion, 'Punto de entrega', null, '📍');
        marcadores[ordenId] = marcador;
      }
      
      console.log(`📍 Mapa actualizado para orden ${ordenId}: (${nuevaLat}, ${nuevaLng})`);
    }
  }

  latInput.addEventListener('input', actualizarMapa);
  latInput.addEventListener('change', actualizarMapa);
  lngInput.addEventListener('input', actualizarMapa);
  lngInput.addEventListener('change', actualizarMapa);
  
  console.log(`✅ Mapa vacío inicializado para orden ${ordenId}`);
}

function inicializarMapa(ordenId, lat, lng) {
  const mapContainer = document.getElementById(`map-orden-${ordenId}`);
  if (!mapContainer) {
    console.error(`❌ No se encontró el contenedor del mapa para orden ${ordenId}`);
    return;
  }

  // Verificar que Google Maps esté disponible
  if (typeof google === 'undefined' || !google.maps) {
    console.error('❌ Google Maps no está disponible');
    return;
  }

  // Crear mapa
  const mapa = MapHelper.createMap(`map-orden-${ordenId}`, { lat, lng }, 15);
  mapas[ordenId] = mapa;

  // Crear marcador
  const marcador = MapHelper.addMarker(mapa, { lat, lng }, 'Punto de entrega', null, '📍');
  marcadores[ordenId] = marcador;
  
  console.log(`✅ Mapa inicializado para orden ${ordenId} en (${lat}, ${lng})`);

  // Actualizar mapa cuando cambien las coordenadas
  const latInput = document.getElementById(`lat-${ordenId}`);
  const lngInput = document.getElementById(`lng-${ordenId}`);

  function actualizarMapa() {
    const nuevaLat = parseFloat(latInput.value);
    const nuevaLng = parseFloat(lngInput.value);

    if (!isNaN(nuevaLat) && !isNaN(nuevaLng)) {
      const nuevaPosicion = { lat: nuevaLat, lng: nuevaLng };
      
      // Mover mapa
      if (mapas[ordenId]) {
        mapas[ordenId].panTo(nuevaPosicion);
      }
      
      // Mover marcador
      if (marcadores[ordenId]) {
        marcadores[ordenId].setPosition(nuevaPosicion);
      }
    }
  }

  latInput.addEventListener('input', actualizarMapa);
  lngInput.addEventListener('change', actualizarMapa);
  lngInput.addEventListener('input', actualizarMapa);
  lngInput.addEventListener('change', actualizarMapa);
}

// 5. CREAR PEDIDO (LLAMAR API POST)
async function crearPedido(ordenId) {
  // Buscar orden predefinida
  const orden = ordenesPredefinidas.find(o => o.id === ordenId);
  if (!orden) {
    alert('❌ Orden no encontrada');
    return;
  }

  // Obtener coordenadas del formulario
  const latInput = document.getElementById(`lat-${ordenId}`);
  const lngInput = document.getElementById(`lng-${ordenId}`);
  const statusDiv = document.getElementById(`status-${ordenId}`);

  // Obtener valores y limpiar espacios
  const latStr = latInput.value.trim();
  const lngStr = lngInput.value.trim();

  // Validar que no estén vacíos
  if (!latStr || !lngStr) {
    statusDiv.innerHTML = '<span style="color: #ef4444;">❌ Ingresa coordenadas válidas</span>';
    return;
  }

  // Convertir a números
  const lat = Number(latStr);
  const lng = Number(lngStr);

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

  // Mostrar estado de carga
  statusDiv.innerHTML = '<span style="color: #10b981;">⏳ Creando pedido...</span>';

  try {
    // Convertir a números con 8 decimales (máximo permitido por el backend)
    const latNum = Number(parseFloat(lat).toFixed(8));
    const lngNum = Number(parseFloat(lng).toFixed(8));

    // Preparar datos para la API
    const orderData = {
      clienteId: Number(orden.clienteId), // Usar clienteId de la orden predefinida
      paymentMethod: 'CASH',
      latitude: latNum,
      longitude: lngNum,
      address: `${latNum}, ${lngNum}`,
      items: orden.items,
    };

    console.log('📤 Enviando datos a API:', orderData);
    console.log('📊 Tipo de latitude:', typeof orderData.latitude, 'Valor:', orderData.latitude);
    console.log('📊 Tipo de longitude:', typeof orderData.longitude, 'Valor:', orderData.longitude);

    // Llamar API POST /orders
    const result = await API.createOrder(orderData);

    // Mostrar éxito
    statusDiv.innerHTML = `
      <span style="color: #10b981;">
        ✅ Pedido creado exitosamente!<br>
        ID: ${result.id} | Estado: ${result.status}
      </span>
    `;

    console.log('✅ Pedido creado:', result);
  } catch (error) {
    // Mostrar error
    statusDiv.innerHTML = `<span style="color: #ef4444;">❌ Error: ${error.message}</span>`;
    console.error('❌ Error al crear pedido:', error);
  }
}

// Exportar funciones globales
window.initClienteView = initClienteView;
window.crearPedido = crearPedido;
