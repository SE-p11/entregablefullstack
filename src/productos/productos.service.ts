import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrearProductoDto } from './dto/crear-producto.dto.js';
import {
  CategoriaProducto,
  Producto,
  TipoMedicamento,
} from './producto.entity.js';

@Injectable()
export class ProductosService {
  private readonly productos: Producto[] = [];
  private siguienteId = 1;

  obtenerTodos(busqueda = ''): Producto[] {
    const termino = this.normalizar(busqueda.trim());
    if (!termino) {
      return [...this.productos];
    }

    return this.productos.filter((producto) =>
      this.normalizar(
        [
          producto.nombre,
          producto.concentracion,
          producto.marca,
          producto.categoria,
          producto.presentacion,
          producto.tipoMedicamento,
        ]
          .filter(Boolean)
          .join(' '),
      ).includes(termino),
    );
  }

  obtenerPorId(id: number): Producto {
    const producto = this.productos.find((item) => item.id === id);
    if (!producto) {
      throw new NotFoundException(`No se encontró el producto ${id}.`);
    }
    return producto;
  }

  crear(datos: CrearProductoDto): Producto {
    const normalizados = this.validarYNormalizar(datos);
    if (this.productos.some((producto) => this.esMismaPresentacion(producto, normalizados))) {
      throw new ConflictException(
        'Esta presentación ya está registrada. Usa “Agregar stock” en el producto existente.',
      );
    }

    const producto = new Producto(this.siguienteId, ...normalizados);
    this.productos.push(producto);
    this.siguienteId += 1;
    return producto;
  }

  actualizar(id: number, datos: CrearProductoDto): Producto {
    const indice = this.productos.findIndex((producto) => producto.id === id);
    if (indice < 0) {
      throw new NotFoundException(`No se encontró el producto ${id}.`);
    }

    const normalizados = this.validarYNormalizar(datos);
    if (
      this.productos.some(
        (producto) =>
          producto.id !== id && this.esMismaPresentacion(producto, normalizados),
      )
    ) {
      throw new ConflictException('Ya existe otra presentación con esos datos.');
    }

    const unidadesAnteriores = this.productos[indice].unidadesSueltas;
    const unidadesConStock = normalizados[3] * normalizados[6] + unidadesAnteriores;
    const actualizado = new Producto(
      id,
      normalizados[0],
      normalizados[1],
      normalizados[2],
      Math.floor(unidadesConStock / normalizados[6]),
      normalizados[4],
      normalizados[5],
      normalizados[6],
      normalizados[7],
      normalizados[8],
      normalizados[9],
      normalizados[10],
      normalizados[11],
      unidadesConStock % normalizados[6],
    );
    this.productos[indice] = actualizado;
    return actualizado;
  }

  agregarStock(id: number, cantidad: number): Producto {
    const indice = this.productos.findIndex((producto) => producto.id === id);
    if (indice < 0) {
      throw new NotFoundException(`No se encontró el producto ${id}.`);
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad a agregar debe ser un entero mayor que cero.');
    }

    const actual = this.productos[indice];
    const actualizado = new Producto(
      actual.id,
      actual.nombre,
      actual.categoria,
      actual.precio,
      actual.stock + cantidad,
      actual.stockMinimo,
      actual.presentacion,
      actual.unidadesPorPaquete,
      actual.concentracion,
      actual.tipoMedicamento,
      actual.marca,
      actual.blistersPorPaquete,
      actual.unidadesPorBlister,
      actual.unidadesSueltas,
    );
    this.productos[indice] = actualizado;
    return actualizado;
  }

  descontarUnidades(id: number, cantidad: number): Producto {
    const indice = this.productos.findIndex((producto) => producto.id === id);
    if (indice < 0) {
      throw new NotFoundException(`No se encontró el producto ${id}.`);
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new BadRequestException('La cantidad a descontar debe ser un entero mayor que cero.');
    }

    const actual = this.productos[indice];
    const unidadesRestantes = actual.obtenerUnidadesTotales() - cantidad;
    if (unidadesRestantes < 0) {
      throw new ConflictException(
        `Stock insuficiente para ${actual.nombre}. Disponible: ${actual.obtenerUnidadesTotales()} unidades.`,
      );
    }

    const actualizado = new Producto(
      actual.id,
      actual.nombre,
      actual.categoria,
      actual.precio,
      Math.floor(unidadesRestantes / actual.unidadesPorPaquete),
      actual.stockMinimo,
      actual.presentacion,
      actual.unidadesPorPaquete,
      actual.concentracion,
      actual.tipoMedicamento,
      actual.marca,
      actual.blistersPorPaquete,
      actual.unidadesPorBlister,
      unidadesRestantes % actual.unidadesPorPaquete,
    );
    this.productos[indice] = actualizado;
    return actualizado;
  }

  private validarYNormalizar(datos: CrearProductoDto): [
    string,
    CategoriaProducto,
    number,
    number,
    number,
    string,
    number,
    string | null,
    TipoMedicamento | null,
    string | null,
    number | null,
    number | null,
  ] {
    if (typeof datos !== 'object' || datos === null) {
      throw new BadRequestException('Los datos del producto son obligatorios.');
    }
    if (typeof datos.nombre !== 'string' || !datos.nombre.trim()) {
      throw new BadRequestException('El nombre del producto es obligatorio.');
    }
    if (
      !['medicamento', 'higiene', 'cuidado-personal'].includes(datos.categoria)
    ) {
      throw new BadRequestException('Selecciona una categoría válida.');
    }
    if (
      typeof datos.precio !== 'number' ||
      !Number.isFinite(datos.precio) ||
      datos.precio <= 0
    ) {
      throw new BadRequestException('El precio del paquete debe ser mayor que cero.');
    }
    if (!Number.isInteger(datos.stock) || datos.stock < 0) {
      throw new BadRequestException('El stock debe ser un número entero igual o mayor que cero.');
    }
    if (!Number.isInteger(datos.stockMinimo) || datos.stockMinimo < 0) {
      throw new BadRequestException(
        'El stock mínimo debe ser un número entero igual o mayor que cero.',
      );
    }
    if (typeof datos.presentacion !== 'string' || !datos.presentacion.trim()) {
      throw new BadRequestException('Indica la presentación de venta.');
    }
    if (!Number.isInteger(datos.unidadesPorPaquete) || datos.unidadesPorPaquete < 1) {
      throw new BadRequestException('Las unidades por paquete deben ser un entero mayor que cero.');
    }

    const esMedicamento = datos.categoria === 'medicamento';
    const concentracion = this.textoOpcional(datos.concentracion);
    const tipoMedicamento = datos.tipoMedicamento ?? null;
    const marca = this.textoOpcional(datos.marca);
    let blistersPorPaquete: number | null = null;
    let unidadesPorBlister: number | null = null;

    if (esMedicamento) {
      if (!concentracion) {
        throw new BadRequestException('Indica la concentración, por ejemplo 500 mg.');
      }
      if (!['generico', 'marca'].includes(tipoMedicamento ?? '')) {
        throw new BadRequestException('Indica si el medicamento es genérico o de marca.');
      }
      if (tipoMedicamento === 'marca' && !marca) {
        throw new BadRequestException('Escribe la marca del medicamento.');
      }

      const usaBlisters =
        datos.blistersPorPaquete !== undefined ||
        datos.unidadesPorBlister !== undefined;
      if (usaBlisters) {
        if (
          !Number.isInteger(datos.blistersPorPaquete) ||
          (datos.blistersPorPaquete ?? 0) < 1 ||
          !Number.isInteger(datos.unidadesPorBlister) ||
          (datos.unidadesPorBlister ?? 0) < 1
        ) {
          throw new BadRequestException(
            'Los blísteres por paquete y las tabletas por blíster deben ser enteros mayores que cero.',
          );
        }
        blistersPorPaquete = datos.blistersPorPaquete!;
        unidadesPorBlister = datos.unidadesPorBlister!;
        const total = blistersPorPaquete * unidadesPorBlister;
        if (datos.unidadesPorPaquete !== total) {
          throw new BadRequestException(
            'Las unidades por paquete deben coincidir con blísteres × tabletas por blíster.',
          );
        }
      }
    }

    return [
      datos.nombre.trim(),
      datos.categoria,
      datos.precio,
      datos.stock,
      datos.stockMinimo,
      datos.presentacion.trim(),
      datos.unidadesPorPaquete,
      esMedicamento ? concentracion : null,
      esMedicamento ? tipoMedicamento : null,
      esMedicamento && tipoMedicamento === 'marca' ? marca : null,
      blistersPorPaquete,
      unidadesPorBlister,
    ];
  }

  private textoOpcional(valor?: string): string | null {
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  }

  private esMismaPresentacion(
    producto: Producto,
    datos: ReturnType<ProductosService['validarYNormalizar']>,
  ): boolean {
    const [
      nombre,
      categoria,
      ,
      ,
      ,
      presentacion,
      unidadesPorPaquete,
      concentracion,
      tipoMedicamento,
      marca,
      blistersPorPaquete,
      unidadesPorBlister,
    ] = datos;

    return (
      this.normalizar(producto.nombre) === this.normalizar(nombre) &&
      producto.categoria === categoria &&
      this.normalizar(producto.presentacion) === this.normalizar(presentacion) &&
      producto.unidadesPorPaquete === unidadesPorPaquete &&
      this.normalizar(producto.concentracion ?? '') ===
        this.normalizar(concentracion ?? '') &&
      producto.tipoMedicamento === tipoMedicamento &&
      this.normalizar(producto.marca ?? '') === this.normalizar(marca ?? '') &&
      producto.blistersPorPaquete === blistersPorPaquete &&
      producto.unidadesPorBlister === unidadesPorBlister
    );
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('es')
      .trim();
  }
}
