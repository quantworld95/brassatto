// API helper para llamadas REST al backend
// Detectar URL automáticamente según el hostname
const getBaseURL = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  return `http://${hostname}:3000`;
};

const API = {
  get baseURL() {
    return getBaseURL();
  },

  // Crear pedido
  async createOrder(orderData) {
    try {
      console.log('📤 Enviando pedido a:', `${this.baseURL}/orders`);
      console.log('📦 Datos:', orderData);
      
      const response = await fetch(`${this.baseURL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log('📥 Respuesta recibida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Pedido creado exitosamente:', result);
      return result;
    } catch (error) {
      console.error('❌ Error al crear pedido:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3000');
      }
      throw error;
    }
  },

  // Obtener pedidos
  async getOrders() {
    try {
      const response = await fetch(`${this.baseURL}/orders`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      throw error;
    }
  },

  // Obtener conductores
  async getDrivers() {
    try {
      const response = await fetch(`${this.baseURL}/users/conductores`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error al obtener conductores:', error);
      throw error;
    }
  },

  // Actualizar estado de pedido
  async updateOrderStatus(orderId, status) {
    try {
      const response = await fetch(`${this.baseURL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      throw error;
    }
  },
};

// Exportar para uso global
window.API = API;

