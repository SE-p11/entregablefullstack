export class ProductosApi {
  async obtenerTodos(busqueda = '') {
    const parametros = new URLSearchParams();
    if (busqueda.trim()) parametros.set('buscar', busqueda.trim());
    const sufijo = parametros.size > 0 ? `?${parametros.toString()}` : '';
    const response = await fetch(`/productos${sufijo}`);
    return this.leerRespuesta(response);
  }

  async crear(datosProducto) {
    return this.enviar('/productos', 'POST', datosProducto);
  }

  async actualizar(id, datosProducto) {
    return this.enviar(`/productos/${id}`, 'PATCH', datosProducto);
  }

  async agregarStock(id, cantidad) {
    return this.enviar(`/productos/${id}/stock`, 'PATCH', { cantidad });
  }

  async enviar(url, metodo, datos) {
    const response = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    return this.leerRespuesta(response);
  }

  async leerRespuesta(response) {
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
