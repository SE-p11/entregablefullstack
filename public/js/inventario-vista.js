import { ProductosApi } from './productos-api.js';

class InventarioVista {
  constructor(api) {
    this.api = api;
    this.formulario = document.querySelector('#form-producto');
    this.botonGuardar = document.querySelector('#guardar-producto');
    this.mensaje = document.querySelector('#mensaje');
    this.lista = document.querySelector('#lista-productos');
    this.busqueda = document.querySelector('#buscar-producto');
    this.formularioEditar = document.querySelector('#form-editar');
    this.formularioStock = document.querySelector('#form-stock');
    this.dialogoEditar = document.querySelector('#editar-dialog');
    this.dialogoStock = document.querySelector('#stock-dialog');
    this.productos = [];
    this.busquedaActual = '';
    this.temporizadorBusqueda = undefined;
    this.formateadorPrecio = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    });
    window.addEventListener('venta-registrada', () => {
      void this.cargarProductos();
    });

    this.configurarFormulario(this.formulario, '');
    this.configurarFormulario(this.formularioEditar, 'edit-');
    this.formulario.addEventListener('submit', (evento) => {
      void this.guardarProducto(evento);
    });
    this.formularioEditar.addEventListener('submit', (evento) => {
      void this.actualizarProducto(evento);
    });
    this.formularioStock.addEventListener('submit', (evento) => {
      void this.guardarReposicion(evento);
    });
    this.lista.addEventListener('click', (evento) => this.manejarAccion(evento));
    this.busqueda.addEventListener('input', () => {
      window.clearTimeout(this.temporizadorBusqueda);
      this.temporizadorBusqueda = window.setTimeout(() => {
        void this.buscarProductos();
      }, 180);
    });
    document.querySelectorAll('[data-cerrar-dialog]').forEach((boton) => {
      boton.addEventListener('click', () => {
        this.dialogoEditar.close();
        this.dialogoStock.close();
      });
    });
    [this.dialogoEditar, this.dialogoStock].forEach((dialogo) => {
      dialogo.addEventListener('click', (evento) => {
        if (evento.target === dialogo) dialogo.close();
      });
    });
  }

  configurarFormulario(formulario, prefijo) {
    const categoria = formulario.querySelector(`[name="categoria"]`);
    const tipo = formulario.querySelector(`[name="tipoMedicamento"]`);
    const usaBlisters = formulario.querySelector(`#${prefijo}usaBlisters`);
    categoria.addEventListener('change', () => this.actualizarCampos(formulario, prefijo));
    tipo.addEventListener('change', () => this.actualizarCampos(formulario, prefijo));
    usaBlisters.addEventListener('change', () => this.actualizarCampos(formulario, prefijo));
    formulario.querySelector(`[name="blistersPorPaquete"]`).addEventListener('input', () =>
      this.actualizarUnidadesPorPaquete(formulario),
    );
    formulario.querySelector(`[name="unidadesPorBlister"]`).addEventListener('input', () =>
      this.actualizarUnidadesPorPaquete(formulario),
    );
    this.actualizarCampos(formulario, prefijo);
  }

  actualizarCampos(formulario, prefijo) {
    const esMedicamento = formulario.elements.namedItem('categoria').value === 'medicamento';
    const esMarca = formulario.elements.namedItem('tipoMedicamento').value === 'marca';
    const usaBlisters = formulario.querySelector(`#${prefijo}usaBlisters`).checked;
    const seccionMedicamento = formulario.querySelector('.medicine-fields');
    const seccionMarca = formulario.querySelector('.brand-field');
    const seccionBlisters = formulario.querySelector('.blister-fields');
    const seccionOtrasUnidades = formulario.querySelector('.other-units-field');

    seccionMedicamento.hidden = !esMedicamento;
    seccionMarca.hidden = !esMedicamento || !esMarca;
    seccionBlisters.hidden = !esMedicamento || !usaBlisters;
    seccionOtrasUnidades.hidden = esMedicamento && usaBlisters;

    this.alternarCampos(seccionMedicamento, esMedicamento);
    this.alternarCampos(seccionMarca, esMedicamento && esMarca);
    this.alternarCampos(seccionBlisters, esMedicamento && usaBlisters);
    this.alternarCampos(seccionOtrasUnidades, !esMedicamento || !usaBlisters);

    if (esMedicamento && usaBlisters) {
      this.actualizarUnidadesPorPaquete(formulario);
    }
  }

  alternarCampos(contenedor, activo) {
    contenedor.querySelectorAll('input, select').forEach((campo) => {
      campo.disabled = !activo;
      campo.required = activo && campo.dataset.opcional !== 'true';
    });
  }

  actualizarUnidadesPorPaquete(formulario) {
    const blisters = Number(formulario.elements.namedItem('blistersPorPaquete').value);
    const unidades = Number(formulario.elements.namedItem('unidadesPorBlister').value);
    const total = formulario.elements.namedItem('unidadesPorPaquete');
    if (total && blisters > 0 && unidades > 0) {
      total.value = String(blisters * unidades);
    }
  }

  async iniciar() {
    await this.cargarProductos();
  }

  async cargarProductos() {
    this.mostrarCargando();
    try {
      this.productos = await this.api.obtenerTodos();
      await this.buscarProductos();
    } catch (error) {
      this.lista.replaceChildren(this.crearFilaVacia('No se pudo cargar el inventario.'));
      this.mostrarMensaje(error.message, true);
    }
  }

  async buscarProductos() {
    this.busquedaActual = this.busqueda.value.trim();
    try {
      const resultados = await this.api.obtenerTodos(this.busquedaActual);
      this.renderizarProductos(resultados);
    } catch (error) {
      this.lista.replaceChildren(this.crearFilaVacia('No se pudo realizar la búsqueda.'));
      this.mostrarMensaje(error.message, true);
    }
  }

  async guardarProducto(evento) {
    evento.preventDefault();
    this.mostrarMensaje('');
    this.botonGuardar.disabled = true;

    try {
      await this.api.crear(this.leerDatos(this.formulario, ''));
      this.formulario.reset();
      this.configurarValoresIniciales(this.formulario, '');
      this.mostrarMensaje('Producto agregado correctamente.');
      await this.cargarProductos();
      this.formulario.elements.namedItem('nombre').focus();
    } catch (error) {
      this.mostrarMensaje(error.message, true);
    } finally {
      this.botonGuardar.disabled = false;
    }
  }

  leerDatos(formulario, prefijo) {
    const datos = new FormData(formulario);
    const categoria = datos.get('categoria');
    const esMedicamento = categoria === 'medicamento';
    const usaBlisters =
      esMedicamento && formulario.querySelector(`#${prefijo}usaBlisters`).checked;
    const unidadesPorPaquete = usaBlisters
      ? Number(datos.get('blistersPorPaquete')) * Number(datos.get('unidadesPorBlister'))
      : Number(datos.get('unidadesPorPaquete'));
    const resultado = {
      nombre: String(datos.get('nombre')).trim(),
      categoria,
      precio: Number(datos.get('precio')),
      stock: Number(datos.get('stock')),
      stockMinimo: Number(datos.get('stockMinimo')),
      presentacion: String(datos.get('presentacion')).trim(),
      unidadesPorPaquete,
    };

    if (esMedicamento) {
      Object.assign(resultado, {
        concentracion: String(datos.get('concentracion')).trim(),
        tipoMedicamento: datos.get('tipoMedicamento'),
        marca: datos.get('marca') ? String(datos.get('marca')).trim() : undefined,
      });
      if (usaBlisters) {
        Object.assign(resultado, {
          blistersPorPaquete: Number(datos.get('blistersPorPaquete')),
          unidadesPorBlister: Number(datos.get('unidadesPorBlister')),
        });
      }
    }
    return resultado;
  }

  async actualizarProducto(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const mensaje = document.querySelector('#mensaje-editar');
    const boton = formulario.querySelector('button[type="submit"]');
    const id = Number(new FormData(formulario).get('id'));
    boton.disabled = true;
    this.mostrarMensajeEn(mensaje, '');
    try {
      await this.api.actualizar(id, this.leerDatos(formulario, 'edit-'));
      this.dialogoEditar.close();
      this.mostrarMensaje('Cambios guardados.');
      await this.cargarProductos();
    } catch (error) {
      this.mostrarMensajeEn(mensaje, error.message, true);
    } finally {
      boton.disabled = false;
    }
  }

  async guardarReposicion(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    this.mostrarMensajeEn(document.querySelector('#mensaje-stock'), '');
    try {
      await this.api.agregarStock(
        Number(datos.get('id')),
        Number(datos.get('cantidad')),
      );
      this.dialogoStock.close();
      this.mostrarMensaje('Stock actualizado correctamente.');
      await this.cargarProductos();
    } catch (error) {
      this.mostrarMensajeEn(document.querySelector('#mensaje-stock'), error.message, true);
    } finally {
      boton.disabled = false;
    }
  }

  manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    const producto = this.productos.find(
      (item) => item.id === Number(boton.dataset.id),
    );
    if (!producto) return;

    if (boton.dataset.accion === 'editar') this.abrirEdicion(producto);
    if (boton.dataset.accion === 'stock') this.abrirReposicion(producto);
  }

  abrirEdicion(producto) {
    const formulario = this.formularioEditar;
    formulario.reset();
    this.asignarValor(formulario, 'id', producto.id);
    this.asignarValor(formulario, 'nombre', producto.nombre);
    this.asignarValor(formulario, 'categoria', producto.categoria);
    this.asignarValor(formulario, 'concentracion', producto.concentracion ?? '');
    this.asignarValor(formulario, 'tipoMedicamento', producto.tipoMedicamento ?? 'generico');
    this.asignarValor(formulario, 'marca', producto.marca ?? '');
    this.asignarValor(formulario, 'presentacion', producto.presentacion);
    this.asignarValor(formulario, 'precio', producto.precio);
    this.asignarValor(formulario, 'stock', producto.stock);
    this.asignarValor(formulario, 'stockMinimo', producto.stockMinimo);
    this.asignarValor(formulario, 'blistersPorPaquete', producto.blistersPorPaquete ?? 1);
    this.asignarValor(formulario, 'unidadesPorBlister', producto.unidadesPorBlister ?? 1);
    this.asignarValor(formulario, 'unidadesPorPaquete', producto.unidadesPorPaquete);
    formulario.querySelector('#edit-usaBlisters').checked =
      producto.blistersPorPaquete !== null;
    this.actualizarCampos(formulario, 'edit-');
    this.dialogoEditar.showModal();
  }

  abrirReposicion(producto) {
    this.formularioStock.reset();
    this.asignarValor(this.formularioStock, 'id', producto.id);
    this.asignarValor(this.formularioStock, 'cantidad', 1);
    document.querySelector('#stock-producto').textContent =
      `${producto.nombre}${producto.concentracion ? ` · ${producto.concentracion}` : ''} — ${producto.presentacion}`;
    this.dialogoStock.showModal();
    document.querySelector('#cantidad-stock').focus();
  }

  asignarValor(formulario, nombre, valor) {
    formulario.elements.namedItem(nombre).value = String(valor);
  }

  configurarValoresIniciales(formulario, prefijo) {
    formulario.querySelector(`#${prefijo}usaBlisters`).checked = true;
    this.actualizarCampos(formulario, prefijo);
  }

  renderizarProductos(productos) {
    const filas = [];
    let grupoActual = '';
    const ordenados = [...productos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es'),
    );

    for (const producto of ordenados) {
      const grupo = this.normalizar(producto.nombre);
      if (grupo !== grupoActual) {
        grupoActual = grupo;
        const cantidadVariantes = ordenados.filter(
          (item) => this.normalizar(item.nombre) === grupo,
        ).length;
        filas.push(this.crearFilaGrupo(producto.nombre, cantidadVariantes));
      }
      filas.push(this.crearFilaProducto(producto));
    }

    this.lista.replaceChildren(
      ...(filas.length > 0
        ? filas
        : [
            this.crearFilaVacia(
              this.busquedaActual
                ? 'No se encontraron productos para esa búsqueda.'
                : 'Aún no hay productos. Agrega el primero con el formulario.',
            ),
          ]),
    );

    const bajos = this.productos.filter((producto) => producto.tieneStockBajo?.() ??
      producto.stock <= producto.stockMinimo).length;
    const valor = this.productos.reduce(
      (total, producto) =>
        total +
        (producto.precio *
          (producto.stock * producto.unidadesPorPaquete +
            (producto.unidadesSueltas ?? 0))) /
          producto.unidadesPorPaquete,
      0,
    );
    document.querySelector('#total-productos').textContent = String(this.productos.length);
    document.querySelector('#productos-bajos').textContent = String(bajos);
    document.querySelector('#valor-inventario').textContent =
      this.formateadorPrecio.format(valor);
    document.querySelector('#conteo-tabla').textContent =
      `${productos.length} ${productos.length === 1 ? 'presentación' : 'presentaciones'}`;
  }

  crearFilaGrupo(nombre, cantidad) {
    const fila = document.createElement('tr');
    fila.className = 'group-row';
    const celda = document.createElement('td');
    celda.colSpan = 6;
    celda.textContent = `${nombre} · ${cantidad} ${cantidad === 1 ? 'presentación' : 'variantes'}`;
    fila.append(celda);
    return fila;
  }

  crearFilaProducto(producto) {
    const fila = document.createElement('tr');
    const nombre = document.createElement('td');
    const nombrePrincipal = document.createElement('strong');
    nombrePrincipal.className = 'product-name';
    nombrePrincipal.textContent = producto.nombre;
    nombre.append(nombrePrincipal);
    if (producto.concentracion) {
      const detalle = document.createElement('small');
      detalle.className = 'product-detail';
      detalle.textContent = `${producto.concentracion} · ${producto.tipoMedicamento === 'generico' ? 'Genérico' : `Marca ${producto.marca}`}`;
      nombre.append(detalle);
    } else {
      const detalle = document.createElement('small');
      detalle.className = 'product-detail';
      detalle.textContent = this.etiquetaCategoria(producto.categoria);
      nombre.append(detalle);
    }

    const presentacion = document.createElement('td');
    presentacion.textContent = producto.presentacion;

    const precio = document.createElement('td');
    precio.textContent = this.formateadorPrecio.format(producto.precio);

    const stock = document.createElement('td');
    const paquetes = document.createElement('strong');
    paquetes.textContent = `${producto.stock} ${producto.presentacion.toLocaleLowerCase('es')}`;
    stock.append(paquetes);
    if (producto.unidadesSueltas > 0) {
      const sobrante = document.createElement('small');
      sobrante.className = 'product-detail';
      sobrante.textContent = `+ ${producto.unidadesSueltas} sueltas`;
      stock.append(sobrante);
    }
    const total = document.createElement('small');
    total.className = 'product-detail';
    total.textContent = `${producto.stock * producto.unidadesPorPaquete + (producto.unidadesSueltas ?? 0)} ${producto.categoria === 'medicamento' && producto.blistersPorPaquete !== null ? 'tabletas/cápsulas' : 'unidades'}`;
    stock.append(total);

    const estado = document.createElement('td');
    const etiqueta = document.createElement('span');
    const stockBajo = producto.stock <= producto.stockMinimo;
    etiqueta.className = `stock-badge${stockBajo ? ' low' : ''}`;
    etiqueta.textContent = stockBajo ? 'Por reponer' : 'Disponible';
    estado.append(etiqueta);

    const acciones = document.createElement('td');
    acciones.className = 'action-cell';
    acciones.append(
      this.crearBotonAccion('Editar', 'editar', producto.id),
      this.crearBotonAccion('+ Stock', 'stock', producto.id),
    );

    fila.append(nombre, presentacion, precio, stock, estado, acciones);
    return fila;
  }

  crearBotonAccion(texto, accion, id) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = accion === 'stock' ? 'action-button secondary' : 'action-button';
    boton.dataset.accion = accion;
    boton.dataset.id = String(id);
    boton.textContent = texto;
    return boton;
  }

  etiquetaCategoria(categoria) {
    return {
      medicamento: 'Medicamento',
      higiene: 'Higiene personal',
      'cuidado-personal': 'Cuidado personal',
    }[categoria] ?? categoria;
  }

  crearFilaVacia(texto) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.className = 'empty-state';
    celda.colSpan = 6;
    celda.textContent = texto;
    fila.append(celda);
    return fila;
  }

  mostrarCargando() {
    this.lista.replaceChildren(this.crearFilaVacia('Cargando inventario...'));
  }

  mostrarMensaje(texto, esError = false) {
    this.mostrarMensajeEn(this.mensaje, texto, esError);
  }

  mostrarMensajeEn(elemento, texto, esError = false) {
    elemento.textContent = texto;
    elemento.classList.toggle('error', esError);
  }

  normalizar(valor) {
    return valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('es')
      .trim();
  }
}

const vista = new InventarioVista(new ProductosApi());
void vista.iniciar();
