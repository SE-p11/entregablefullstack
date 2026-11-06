import type {
  CategoriaProducto,
  TipoMedicamento,
} from '../producto.entity.js';

export class CrearProductoDto {
  nombre!: string;
  categoria!: CategoriaProducto;
  precio!: number;
  stock!: number;
  stockMinimo!: number;
  presentacion!: string;
  unidadesPorPaquete!: number;
  concentracion?: string;
  tipoMedicamento?: TipoMedicamento;
  marca?: string;
  blistersPorPaquete?: number;
  unidadesPorBlister?: number;
}
