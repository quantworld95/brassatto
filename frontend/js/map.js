// Helper para Google Maps
const MapHelper = {
  // Verificar que Google Maps esté disponible
  isAvailable() {
    return typeof google !== 'undefined' && google.maps;
  },
  
  // Crear mapa
  createMap(containerId, center, zoom = 13) {
    if (!this.isAvailable()) {
      console.error('❌ Google Maps no está disponible aún');
      throw new Error('Google Maps no está cargado. Por favor espera unos segundos.');
    }
    
    const map = new google.maps.Map(document.getElementById(containerId), {
      center: center,
      zoom: zoom,
      mapTypeId: 'roadmap',
      // Sin estilos personalizados - usa el estilo claro por defecto de Google Maps
    });
    return map;
  },

  // Agregar marcador
  addMarker(map, position, title, icon = null, label = null) {
    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: title,
      icon: icon,
      label: label,
    });
    return marker;
  },

  // Dibujar ruta (polyline simple)
  drawRoute(map, points, color = '#8b5cf6') {
    const path = points.map(p => ({ lat: p.lat, lng: p.lng }));
    
    const polyline = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 3,
    });

    polyline.setMap(map);
    return polyline;
  },

  // Ajustar vista para mostrar todos los puntos
  fitBounds(map, points) {
    if (points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach(point => {
      bounds.extend({ lat: point.lat, lng: point.lng });
    });

    map.fitBounds(bounds);
    
    // Ajustar zoom máximo
    google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom() > 15) {
        map.setZoom(15);
      }
    });
  },
};

// Exportar para uso global
window.MapHelper = MapHelper;
