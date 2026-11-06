export type CategoriaProducto =
  | 'medicamento'
  | 'higiene'
  | 'cuidado-personal';

export type TipoMedicamento = 'generico' | 'marca';

export class Producto {
  constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly categoria: CategoriaProducto,
    public readonly precio: number,
    public readonly stock: number,
    public readonly stockMinimo: number,
    public readonly presentacion: string,
    public readonly unidadesPorPaquete: number,
    public readonly concentracion: string | null,
    public readonly tipoMedicamento: TipoMedicamento | null,
    public readonly marca: string | null,
    public readonly blistersPorPaquete: number | null,
    public readonly unidadesPorBlister: number | null,
    public readonly unidadesSueltas = 0,
  ) {}

  tieneStockBajo(): boolean {
    return this.stock <= this.stockMinimo;
  }

  obtenerUnidadesTotales(): number {
    return this.stock * this.unidadesPorPaquete + this.unidadesSueltas;
  }

  obtenerGrupoBusqueda(): string {
    return this.nombre.trim().toLocaleLowerCase('es');
  }
}
