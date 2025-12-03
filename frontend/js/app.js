// Router principal de la PWA
let currentView = 'home';

// Configuración del backend
const BACKEND_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  loadInitialView();
});

// Router simple basado en hash
function initRouter() {
  // Escuchar cambios en el hash
  window.addEventListener('hashchange', () => {
    loadInitialView();
  });
}

function loadInitialView() {
  const hash = window.location.hash.slice(1) || '/';
  navigateTo(hash);
}

// Navegar a una vista
function navigateTo(route) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Mostrar la vista correspondiente
  let viewId = 'view-home';
  
  if (route === '/cliente' || route === 'cliente') {
    viewId = 'view-cliente';
    // Pequeño delay para asegurar que los scripts estén cargados
    setTimeout(() => {
      if (typeof initClienteView === 'function') {
        initClienteView();
      } else {
        console.error('❌ initClienteView no está definida');
      }
    }, 100);
  } else if (route === '/conductor' || route === 'conductor') {
    viewId = 'view-conductor';
    if (typeof initConductorView === 'function') {
      initConductorView();
    }
  } else if (route === '/admin' || route === 'admin') {
    viewId = 'view-admin';
    if (typeof initAdminView === 'function') {
      initAdminView();
    }
  }

  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add('active');
    currentView = viewId.replace('view-', '');
  }

  // Actualizar hash sin recargar
  if (route !== '/') {
    window.location.hash = route;
  } else {
    window.location.hash = '';
  }
}

// Exportar para uso global
window.navigateTo = navigateTo;

