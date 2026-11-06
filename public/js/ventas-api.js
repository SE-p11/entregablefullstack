export class VentasApi {
  async obtenerProductos(busqueda = '') {
    const parametros = new URLSearchParams();
    if (busqueda.trim()) parametros.set('buscar', busqueda.trim());
    const sufijo = parametros.size > 0 ? `?${parametros.toString()}` : '';
    return this.solicitar(`/productos${sufijo}`);
  }

  async obtenerVentas() {
    return this.solicitar('/ventas');
  }

  async registrarVenta(items) {
    return this.solicitar('/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  }

  async solicitar(url, opciones = {}) {
    const response = await fetch(url, opciones);
    const datos = await response.json();

    if (!response.ok) {
      const mensaje = Array.isArray(datos.message)
        ? datos.message.join(' ')
        : datos.message;
      throw new Error(mensaje || 'No se pudo completar la solicitud.');
    }

    return datos;
  }
}
