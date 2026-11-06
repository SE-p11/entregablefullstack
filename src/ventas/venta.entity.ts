import type { UnidadVenta } from './dto/crear-venta.dto.js';

export class DetalleVenta {
  constructor(
    public readonly productoId: number,
    public readonly nombre: string,
    public readonly variante: string,
    public readonly presentacion: string,
    public readonly unidad: UnidadVenta,
    public readonly cantidad: number,
    public readonly unidadesDescontadas: number,
    public readonly subtotal: number,
  ) {}
}

export class Venta {
  constructor(
    public readonly id: number,
    public readonly fecha: string,
    public readonly detalles: DetalleVenta[],
    public readonly total: number,
  ) {}
}
