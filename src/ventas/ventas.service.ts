import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ProductosService } from '../productos/productos.service.js';
import type { Producto } from '../productos/producto.entity.js';
import {
  CrearVentaDto,
  ItemVentaDto,
  UnidadVenta,
} from './dto/crear-venta.dto.js';
import { DetalleVenta, Venta } from './venta.entity.js';

@Injectable()
export class VentasService {
  private readonly ventas: Venta[] = [];
  private siguienteId = 1;

  constructor(private readonly productosService: ProductosService) {}

  obtenerTodas(): Venta[] {
    return [...this.ventas].reverse();
  }

  crear(datos: CrearVentaDto): Venta {
    if (!datos || !Array.isArray(datos.items) || datos.items.length === 0) {
      throw new BadRequestException('Agrega al menos un producto a la venta.');
    }

    const unidadesPorProducto = new Map<number, number>();
    const lineas = datos.items.map((item) => {
      this.validarItem(item);
      const producto = this.productosService.obtenerPorId(item.productoId);
      const unidadesDescontadas =
        item.cantidad * this.obtenerFactorUnidades(producto, item.unidad);
      unidadesPorProducto.set(
        producto.id,
        (unidadesPorProducto.get(producto.id) ?? 0) + unidadesDescontadas,
      );
      return { item, producto, unidadesDescontadas };
    });

    for (const [productoId, necesarias] of unidadesPorProducto) {
      const producto = this.productosService.obtenerPorId(productoId);
      if (producto.obtenerUnidadesTotales() < necesarias) {
        throw new ConflictException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.obtenerUnidadesTotales()} unidades.`,
        );
      }
    }

    const detalles = lineas.map(({ item, producto, unidadesDescontadas }) =>
      this.crearDetalle(item, producto, unidadesDescontadas),
    );

    for (const [productoId, unidades] of unidadesPorProducto) {
      this.productosService.descontarUnidades(productoId, unidades);
    }

    const total = this.redondear(
      detalles.reduce((suma, detalle) => suma + detalle.subtotal, 0),
    );
    const venta = new Venta(
      this.siguienteId,
      new Date().toISOString(),
      detalles,
      total,
    );
    this.ventas.push(venta);
    this.siguienteId += 1;
    return venta;
  }

  private validarItem(item: ItemVentaDto): void {
    if (typeof item !== 'object' || item === null) {
      throw new BadRequestException('Cada artículo de la venta debe ser válido.');
    }
    if (!Number.isInteger(item.productoId) || item.productoId < 1) {
      throw new BadRequestException('Selecciona un producto válido.');
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
      throw new BadRequestException('La cantidad debe ser un entero mayor que cero.');
    }
    if (!['presentacion', 'blister', 'unidad'].includes(item.unidad)) {
      throw new BadRequestException('Selecciona una unidad de venta válida.');
    }
  }

  private obtenerFactorUnidades(
    producto: Producto,
    unidad: UnidadVenta,
  ): number {
    if (unidad === 'presentacion') return producto.unidadesPorPaquete;
    if (unidad === 'blister') {
      if (!producto.unidadesPorBlister) {
        throw new BadRequestException(
          `${producto.nombre} no tiene una presentación en blíster registrada.`,
        );
      }
      return producto.unidadesPorBlister;
    }
    return 1;
  }

  private crearDetalle(
    item: ItemVentaDto,
    producto: Producto,
    unidadesDescontadas: number,
  ): DetalleVenta {
    const valorEnCentavos = Math.round(producto.precio * 100);
    const subtotalEnCentavos = Math.round(
      (valorEnCentavos * unidadesDescontadas) / producto.unidadesPorPaquete,
    );
    const variante = [
      producto.concentracion,
      producto.tipoMedicamento === 'marca'
        ? producto.marca
        : producto.tipoMedicamento === 'generico'
          ? 'Genérico'
          : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return new DetalleVenta(
      producto.id,
      producto.nombre,
      variante,
      producto.presentacion,
      item.unidad,
      item.cantidad,
      unidadesDescontadas,
      subtotalEnCentavos / 100,
    );
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
