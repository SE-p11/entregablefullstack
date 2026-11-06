export type UnidadVenta = 'presentacion' | 'blister' | 'unidad';

export class ItemVentaDto {
  productoId!: number;
  cantidad!: number;
  unidad!: UnidadVenta;
}

export class CrearVentaDto {
  items!: ItemVentaDto[];
}
