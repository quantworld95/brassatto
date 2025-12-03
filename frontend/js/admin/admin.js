// Vista Admin - Dashboard de monitoreo
let adminMap = null;
let driverMarkers = [];
let updateInterval = null;

function initAdminView() {
  const container = document.getElementById('admin-container');
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>📊 Dashboard de Monitoreo</h2>
        <button class="btn btn-secondary" onclick="actualizarDashboard()">
          🔄 Actualizar
        </button>
      </div>

      <div class="map-container">
        <div id="admin-map" style="width: 100%; height: 100%;"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🚗 Conductores</div>
      <div id="drivers-list"></div>
    </div>

    <div class="card">
      <div class="card-title">📦 Pedidos</div>
      <div id="orders-list"></div>
    </div>
  `;

  // Inicializar mapa
  setTimeout(() => {
    initAdminMap();
    loadDashboard();
    
    // Actualizar automáticamente cada 5 segundos
    updateInterval = setInterval(() => {
      loadDashboard();
    }, 5000);
  }, 100);
}

function initAdminMap() {
  // Centro: Plaza 24 de Septiembre
  const center = { lat: -17.7833, lng: -63.1821 };
  adminMap = MapHelper.createMap('admin-map', center, 13);
}

async function loadDashboard() {
  await loadDrivers();
  await loadOrders();
}

async function loadDrivers() {
  try {
    const drivers = await API.getDrivers();
    const listContainer = document.getElementById('drivers-list');
    
    if (!listContainer) return;

    // Limpiar marcadores anteriores
    driverMarkers.forEach(marker => marker.setMap(null));
    driverMarkers = [];

    let html = '';
    
    drivers.forEach(driver => {
      const estado = driver.estado || 'DESCONECTADO';
      const lat = driver.latitudActual ? parseFloat(driver.latitudActual) : null;
      const lng = driver.longitudActual ? parseFloat(driver.longitudActual) : null;
      
      const statusClass = estado === 'DISPONIBLE' ? 'status-disponible' : 
                         estado === 'OCUPADO' ? 'status-ocupado' : 
                         'status-offline';
      
      html += `
        <div style="padding: 15px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Conductor #${driver.id}</strong>
              <span class="status-badge ${statusClass}" style="margin-left: 10px;">
                ${estado}
              </span>
            </div>
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
            👤 ${driver.usuario?.nombre || 'N/A'}<br>
            📍 ${lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Sin ubicación'}
          </div>
        </div>
      `;

      // Agregar marcador en el mapa si tiene coordenadas
      if (lat && lng && adminMap) {
        const iconColor = estado === 'DISPONIBLE' ? '🟢' : 
                         estado === 'OCUPADO' ? '🟠' : 
                         '⚫';
        
        const marker = MapHelper.addMarker(
          adminMap,
          { lat, lng },
          `Conductor #${driver.id} - ${estado}`,
          null,
          iconColor
        );
        
        driverMarkers.push(marker);
      }
    });

    listContainer.innerHTML = html || '<p style="color: var(--text-secondary);">No hay conductores</p>';

    // Ajustar vista del mapa si hay marcadores
    if (driverMarkers.length > 0 && adminMap) {
      const bounds = new google.maps.LatLngBounds();
      driverMarkers.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      adminMap.fitBounds(bounds);
    }
  } catch (error) {
    console.error('Error al cargar conductores:', error);
    document.getElementById('drivers-list').innerHTML = 
      `<p style="color: #ef4444;">❌ Error al cargar conductores</p>`;
  }
}

async function loadOrders() {
  try {
    const orders = await API.getOrders();
    const listContainer = document.getElementById('orders-list');
    
    if (!listContainer) return;

    // Filtrar solo pedidos relevantes
    const relevantOrders = orders
      .filter(o => o.status === 'READY_FOR_PICKUP' || o.status === 'ASSIGNED' || o.status === 'CONFIRMED')
      .slice(0, 10); // Limitar a 10

    if (relevantOrders.length === 0) {
      listContainer.innerHTML = '<p style="color: var(--text-secondary);">No hay pedidos pendientes</p>';
      return;
    }

    let html = '';
    
    relevantOrders.forEach(order => {
      const statusClass = order.status === 'READY_FOR_PICKUP' ? 'status-disponible' : 
                         order.status === 'ASSIGNED' ? 'status-ocupado' : 
                         'status-offline';
      
      html += `
        <div style="padding: 15px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Pedido #${order.id}</strong>
              <span class="status-badge ${statusClass}" style="margin-left: 10px;">
                ${order.status}
              </span>
            </div>
            <div style="font-weight: 600;">
              Bs ${parseFloat(order.total || 0).toFixed(2)}
            </div>
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
            📍 ${order.address || 'Sin dirección'}<br>
            ${order.cliente?.usuario?.nombre ? `👤 ${order.cliente.usuario.nombre}` : ''}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar pedidos:', error);
    document.getElementById('orders-list').innerHTML = 
      `<p style="color: #ef4444;">❌ Error al cargar pedidos</p>`;
  }
}

function actualizarDashboard() {
  loadDashboard();
}

// Limpiar interval al salir de la vista
window.addEventListener('hashchange', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
});

// Exportar para uso global
window.initAdminView = initAdminView;
window.actualizarDashboard = actualizarDashboard;

