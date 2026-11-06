import { VentasApi } from './ventas-api.js';

class VentasVista {
  constructor(api) {
    this.api = api;
    this.productos = [];
    this.carrito = [];
    this.busqueda = document.querySelector('#buscar-venta');
    this.resultados = document.querySelector('#resultados-venta');
    this.listaCarrito = document.querySelector('#carrito-venta');
    this.historial = document.querySelector('#historial-ventas');
    this.mensaje = document.querySelector('#mensaje-venta');
    this.botonConfirmar = document.querySelector('#confirmar-venta');
    this.temporizadorBusqueda = undefined;
    this.formateadorPrecio = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    });

    document.querySelectorAll('[data-vista]').forEach((enlace) => {
      enlace.addEventListener('click', (evento) => {
        evento.preventDefault();
        this.mostrarVista(enlace.dataset.vista);
      });
    });
    this.busqueda.addEventListener('input', () => {
      window.clearTimeout(this.temporizadorBusqueda);
      this.temporizadorBusqueda = window.setTimeout(() => {
        void this.buscarProductos();
      }, 180);
    });
    this.resultados.addEventListener('click', (evento) => this.agregarProducto(evento));
    this.listaCarrito.addEventListener('click', (evento) => this.actualizarCarrito(evento));
    this.listaCarrito.addEventListener('change', (evento) =>
      this.actualizarCantidadCarrito(evento),
    );
    this.botonConfirmar.addEventListener('click', () => {
      void this.confirmarVenta();
    });
  }

  async mostrarVista(nombre) {
    const mostrarVentas = nombre === 'ventas';
    document.querySelector('#vista-inventario').hidden = mostrarVentas;
    document.querySelector('#vista-ventas').hidden = !mostrarVentas;
    document.querySelector('#page-title').textContent = mostrarVentas
      ? 'Registrar una venta'
      : 'Inventario de botica';
    document.querySelector('#page-subtitle').textContent = mostrarVentas
      ? 'Busca productos, selecciona cómo se venden y confirma el cobro.'
      : 'Controla tus productos y revisa qué necesitas reponer.';

    document.querySelectorAll('[data-vista]').forEach((enlace) => {
      const activo = enlace.dataset.vista === nombre;
      enlace.classList.toggle('active', activo);
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    });

    history.replaceState(null, '', mostrarVentas ? '#ventas' : '#inventario');
    if (mostrarVentas) {
      await Promise.all([this.buscarProductos(), this.cargarHistorial()]);
      this.busqueda.focus();
    }
  }

  async buscarProductos() {
    this.resultados.replaceChildren(this.crearTexto('Buscando productos...', 'empty-state'));
    try {
      this.productos = await this.api.obtenerProductos(this.busqueda.value);
      this.renderizarResultados();
    } catch (error) {
      this.resultados.replaceChildren(
        this.crearTexto(error.message, 'message error'),
      );
    }
  }

  renderizarResultados() {
    const disponibles = this.productos.filter(
      (producto) => this.obtenerUnidadesDisponibles(producto) > 0,
    );
    document.querySelector('#sale-product-count').textContent =
      `${disponibles.length} ${disponibles.length === 1 ? 'producto' : 'productos'}`;
    if (disponibles.length === 0) {
      this.resultados.replaceChildren(
        this.crearTexto(
          this.busqueda.value
            ? 'No encontramos productos disponibles con esa búsqueda.'
            : 'No hay productos disponibles. Registra productos en el inventario.',
          'empty-state',
        ),
      );
      return;
    }

    this.resultados.replaceChildren(
      ...disponibles.map((producto) => this.crearTarjetaProducto(producto)),
    );
  }

  crearTarjetaProducto(producto) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'sale-product';

    const info = document.createElement('div');
    info.className = 'sale-product-info';
    const titulo = document.createElement('strong');
    titulo.textContent = producto.nombre;
    const subtitulo = document.createElement('small');
    subtitulo.textContent = [
      producto.concentracion,
      producto.tipoMedicamento === 'marca'
        ? producto.marca
        : producto.tipoMedicamento === 'generico'
          ? 'Genérico'
          : this.etiquetaCategoria(producto.categoria),
    ]
      .filter(Boolean)
      .join(' · ');
    const existencias = document.createElement('small');
    existencias.className = 'available-stock';
    existencias.textContent = `Disponibles: ${this.obtenerUnidadesDisponibles(producto)} unidades`;
    info.append(titulo, subtitulo, existencias);

    const controls = document.createElement('div');
    controls.className = 'sale-product-controls';
    const selector = document.createElement('select');
    selector.className = 'sale-unit';
    selector.setAttribute('aria-label', `Unidad de venta de ${producto.nombre}`);
    const opciones = [];
    if (producto.stock > 0) {
      opciones.push(['presentacion', producto.presentacion]);
    }
    if (
      producto.unidadesPorBlister &&
      this.obtenerUnidadesDisponibles(producto) >= producto.unidadesPorBlister
    ) {
      opciones.push(['blister', 'Blíster']);
    }
    opciones.push([
      'unidad',
      producto.categoria === 'medicamento' && producto.unidadesPorBlister
        ? 'Tableta / unidad'
        : 'Unidad',
    ]);
    for (const [valor, texto] of opciones) {
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = texto;
      selector.append(opcion);
    }

    const cantidad = document.createElement('input');
    cantidad.className = 'sale-quantity';
    cantidad.type = 'number';
    cantidad.min = '1';
    cantidad.step = '1';
    cantidad.value = '1';
    cantidad.setAttribute('aria-label', `Cantidad de ${producto.nombre}`);
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'action-button secondary';
    boton.dataset.accion = 'agregar';
    boton.dataset.id = String(producto.id);
    boton.textContent = 'Agregar';

    controls.append(selector, cantidad, boton);
    tarjeta.append(info, controls);
    return tarjeta;
  }

  agregarProducto(evento) {
    const boton = evento.target.closest('button[data-accion="agregar"]');
    if (!boton) return;
    const tarjeta = boton.closest('.sale-product');
    const producto = this.productos.find(
      (item) => item.id === Number(boton.dataset.id),
    );
    if (!producto) return;

    const unidad = tarjeta.querySelector('.sale-unit').value;
    const cantidad = Number(tarjeta.querySelector('.sale-quantity').value);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      this.mostrarMensaje('La cantidad debe ser un entero mayor que cero.', true);
      return;
    }

    const existente = this.carrito.find(
      (item) => item.productoId === producto.id && item.unidad === unidad,
    );
    const unidadesSolicitadas =
      (existente?.cantidad ?? 0) * this.factorUnidad(producto, unidad) +
      cantidad * this.factorUnidad(producto, unidad);
    if (unidadesSolicitadas > this.obtenerUnidadesDisponibles(producto)) {
      this.mostrarMensaje(
        `Stock insuficiente de ${producto.nombre}. Solo hay ${this.obtenerUnidadesDisponibles(producto)} unidades.`,
        true,
      );
      return;
    }

    if (existente) existente.cantidad += cantidad;
    else this.carrito.push({ productoId: producto.id, producto, unidad, cantidad });
    this.mostrarMensaje('');
    this.renderizarCarrito();
  }

  actualizarCarrito(evento) {
    const boton = evento.target.closest('button[data-accion="quitar"]');
    if (!boton) return;
    this.carrito = this.carrito.filter(
      (item) =>
        item.productoId !== Number(boton.dataset.id) ||
        item.unidad !== boton.dataset.unidad,
    );
    this.renderizarCarrito();
  }

  actualizarCantidadCarrito(evento) {
    const campo = evento.target.closest('input[data-cantidad]');
    if (!campo) return;
    const item = this.carrito.find(
      (linea) =>
        linea.productoId === Number(campo.dataset.id) &&
        linea.unidad === campo.dataset.unidad,
    );
    if (!item) return;

    const cantidad = Number(campo.value);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      this.mostrarMensaje('La cantidad debe ser un entero mayor que cero.', true);
      campo.value = String(item.cantidad);
      return;
    }
    const unidades = cantidad * this.factorUnidad(item.producto, item.unidad);
    if (unidades > this.obtenerUnidadesDisponibles(item.producto)) {
      this.mostrarMensaje('La cantidad supera el stock disponible.', true);
      campo.value = String(item.cantidad);
      return;
    }
    item.cantidad = cantidad;
    this.mostrarMensaje('');
    this.renderizarCarrito();
  }

  renderizarCarrito() {
    if (this.carrito.length === 0) {
      this.listaCarrito.replaceChildren(
        this.crearTexto('Busca un producto y agrégalo a la venta.', 'empty-state'),
      );
    } else {
      this.listaCarrito.replaceChildren(...this.carrito.map((item) => this.crearLineaCarrito(item)));
    }

    const total = this.carrito.reduce(
      (suma, item) => suma + this.subtotal(item.producto, item.cantidad, item.unidad),
      0,
    );
    const cantidadArticulos = this.carrito.reduce((suma, item) => suma + item.cantidad, 0);
    document.querySelector('#venta-total').textContent =
      this.formateadorPrecio.format(total);
    document.querySelector('#cart-count').textContent =
      `${cantidadArticulos} ${cantidadArticulos === 1 ? 'artículo' : 'artículos'}`;
    this.botonConfirmar.disabled = this.carrito.length === 0;
  }

  crearLineaCarrito(item) {
    const fila = document.createElement('article');
    fila.className = 'cart-line';
    const info = document.createElement('div');
    info.className = 'cart-line-info';
    const nombre = document.createElement('strong');
    nombre.textContent = item.producto.nombre;
    const detalle = document.createElement('small');
    detalle.textContent = `${this.detalleProducto(item.producto)} · ${this.etiquetaUnidad(item.producto, item.unidad)}`;
    info.append(nombre, detalle);

    const controles = document.createElement('div');
    controles.className = 'cart-line-controls';
    const cantidad = document.createElement('input');
    cantidad.type = 'number';
    cantidad.min = '1';
    cantidad.step = '1';
    cantidad.value = String(item.cantidad);
    cantidad.dataset.cantidad = 'true';
    cantidad.dataset.id = String(item.productoId);
    cantidad.dataset.unidad = item.unidad;
    cantidad.setAttribute('aria-label', `Cantidad de ${item.producto.nombre}`);
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'remove-button';
    quitar.dataset.accion = 'quitar';
    quitar.dataset.id = String(item.productoId);
    quitar.dataset.unidad = item.unidad;
    quitar.setAttribute('aria-label', `Quitar ${item.producto.nombre}`);
    quitar.textContent = '×';
    controles.append(cantidad, quitar);

    const subtotal = document.createElement('strong');
    subtotal.className = 'cart-line-subtotal';
    subtotal.textContent = this.formateadorPrecio.format(
      this.subtotal(item.producto, item.cantidad, item.unidad),
    );
    fila.append(info, controles, subtotal);
    return fila;
  }

  async confirmarVenta() {
    this.botonConfirmar.disabled = true;
    this.mostrarMensaje('');
    try {
      const venta = await this.api.registrarVenta(
        this.carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          unidad: item.unidad,
        })),
      );
      this.carrito = [];
      this.renderizarCarrito();
      this.mostrarMensaje(`Venta #${venta.id} registrada correctamente.`);
      await Promise.all([this.buscarProductos(), this.cargarHistorial()]);
      window.dispatchEvent(new CustomEvent('venta-registrada'));
    } catch (error) {
      this.mostrarMensaje(error.message, true);
    } finally {
      this.botonConfirmar.disabled = this.carrito.length === 0;
    }
  }

  async cargarHistorial() {
    try {
      const ventas = await this.api.obtenerVentas();
      this.renderizarHistorial(ventas);
    } catch (error) {
      this.historial.replaceChildren(this.crearTexto(error.message, 'message error'));
    }
  }

  renderizarHistorial(ventas) {
    document.querySelector('#history-count').textContent =
      `${ventas.length} ${ventas.length === 1 ? 'venta' : 'ventas'}`;
    if (ventas.length === 0) {
      this.historial.replaceChildren(
        this.crearTexto('Todavía no hay ventas registradas.', 'empty-state'),
      );
      return;
    }

    this.historial.replaceChildren(
      ...ventas.map((venta) => this.crearRegistroVenta(venta)),
    );
  }

  crearRegistroVenta(venta) {
    const articulo = document.createElement('article');
    articulo.className = 'history-sale';
    const cabecera = document.createElement('div');
    cabecera.className = 'history-sale-heading';
    const titulo = document.createElement('strong');
    titulo.textContent = `Venta #${venta.id}`;
    const fecha = document.createElement('time');
    fecha.dateTime = venta.fecha;
    fecha.textContent = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(venta.fecha));
    cabecera.append(titulo, fecha);

    const detalle = document.createElement('p');
    detalle.className = 'history-sale-items';
    detalle.textContent = venta.detalles
      .map(
        (item) =>
          `${item.cantidad} ${this.etiquetaUnidadPorTipo(item.unidad, item.presentacion)} de ${item.nombre}${item.variante ? ` (${item.variante})` : ''}`,
      )
      .join(' · ');
    const total = document.createElement('strong');
    total.className = 'history-sale-total';
    total.textContent = this.formateadorPrecio.format(venta.total);
    articulo.append(cabecera, detalle, total);
    return articulo;
  }

  subtotal(producto, cantidad, unidad) {
    const centavos = Math.round(producto.precio * 100);
    const unidades = this.factorUnidad(producto, unidad) * cantidad;
    return Math.round((centavos * unidades) / producto.unidadesPorPaquete) / 100;
  }

  factorUnidad(producto, unidad) {
    if (unidad === 'presentacion') return producto.unidadesPorPaquete;
    if (unidad === 'blister') return producto.unidadesPorBlister;
    return 1;
  }

  obtenerUnidadesDisponibles(producto) {
    return producto.stock * producto.unidadesPorPaquete + (producto.unidadesSueltas ?? 0);
  }

  detalleProducto(producto) {
    return [
      producto.concentracion,
      producto.tipoMedicamento === 'marca'
        ? producto.marca
        : producto.tipoMedicamento === 'generico'
          ? 'Genérico'
          : this.etiquetaCategoria(producto.categoria),
    ]
      .filter(Boolean)
      .join(' · ');
  }

  etiquetaCategoria(categoria) {
    return {
      medicamento: 'Medicamento',
      higiene: 'Higiene personal',
      'cuidado-personal': 'Cuidado personal',
    }[categoria] ?? categoria;
  }

  etiquetaUnidad(producto, unidad) {
    if (unidad === 'presentacion') return producto.presentacion;
    return unidad === 'blister'
      ? 'Blíster'
      : producto.categoria === 'medicamento' && producto.unidadesPorBlister
        ? 'Tableta / unidad'
        : 'Unidad';
  }

  etiquetaUnidadPorTipo(unidad, presentacion) {
    if (unidad === 'presentacion') return presentacion.toLocaleLowerCase('es');
    return unidad === 'blister' ? 'blísteres' : 'unidades';
  }

  crearTexto(texto, clase) {
    const elemento = document.createElement('p');
    elemento.className = clase;
    elemento.textContent = texto;
    return elemento;
  }

  mostrarMensaje(texto, esError = false) {
    this.mensaje.textContent = texto;
    this.mensaje.classList.toggle('error', esError);
  }
}

const vista = new VentasVista(new VentasApi());
if (window.location.hash === '#ventas') {
  void vista.mostrarVista('ventas');
}
