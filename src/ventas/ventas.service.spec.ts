import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductosService } from '../productos/productos.service.js';
import { VentasService } from './ventas.service.js';

describe('VentasService', () => {
  let productosService: ProductosService;
  let ventasService: VentasService;

  beforeEach(() => {
    productosService = new ProductosService();
    ventasService = new VentasService(productosService);
    productosService.crear({
      nombre: 'Paracetamol',
      categoria: 'medicamento',
      concentracion: '500 mg',
      tipoMedicamento: 'generico',
      precio: 4.5,
      stock: 2,
      stockMinimo: 1,
      presentacion: 'Caja',
      blistersPorPaquete: 2,
      unidadesPorBlister: 10,
      unidadesPorPaquete: 20,
    });
  });

  it('records a unit sale and keeps the opened package remainder', () => {
    const sale = ventasService.crear({
      items: [{ productoId: 1, cantidad: 3, unidad: 'unidad' }],
    });

    expect(sale.total).toBe(0.68);
    expect(productosService.obtenerPorId(1).stock).toBe(1);
    expect(productosService.obtenerPorId(1).unidadesSueltas).toBe(17);
    expect(productosService.obtenerPorId(1).obtenerUnidadesTotales()).toBe(37);
  });

  it('sells blister quantities using the configured blister size', () => {
    const sale = ventasService.crear({
      items: [{ productoId: 1, cantidad: 1, unidad: 'blister' }],
    });

    expect(sale.total).toBe(2.25);
    expect(productosService.obtenerPorId(1).obtenerUnidadesTotales()).toBe(30);
  });

  it('rejects a sale when any requested item is out of stock without partial deductions', () => {
    expect(() =>
      ventasService.crear({
        items: [
          { productoId: 1, cantidad: 1, unidad: 'presentacion' },
          { productoId: 1, cantidad: 21, unidad: 'unidad' },
        ],
      }),
    ).toThrow(ConflictException);
    expect(productosService.obtenerPorId(1).obtenerUnidadesTotales()).toBe(40);
    expect(ventasService.obtenerTodas()).toHaveLength(0);
  });

  it('rejects empty carts and non-positive quantities', () => {
    expect(() => ventasService.crear({ items: [] })).toThrow(
      BadRequestException,
    );
    expect(() =>
      ventasService.crear({
        items: [{ productoId: 1, cantidad: 0, unidad: 'unidad' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects blister sales for medicines without a blister composition', () => {
    productosService.crear({
      nombre: 'Jarabe',
      categoria: 'medicamento',
      concentracion: '100 ml',
      tipoMedicamento: 'generico',
      precio: 10,
      stock: 2,
      stockMinimo: 1,
      presentacion: 'Frasco',
      unidadesPorPaquete: 1,
    });

    expect(() =>
      ventasService.crear({
        items: [{ productoId: 2, cantidad: 1, unidad: 'blister' }],
      }),
    ).toThrow(BadRequestException);
  });
});
