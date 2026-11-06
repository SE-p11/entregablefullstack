import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductosService } from './productos.service.js';

describe('ProductosService', () => {
  let service: ProductosService;

  beforeEach(() => {
    service = new ProductosService();
  });

  const crearParacetamol = (overrides = {}) => ({
    nombre: 'Paracetamol',
    categoria: 'medicamento' as const,
    precio: 4.5,
    stock: 2,
    stockMinimo: 3,
    presentacion: 'Caja',
    blistersPorPaquete: 2,
    unidadesPorBlister: 10,
    unidadesPorPaquete: 20,
    concentracion: '500 mg',
    tipoMedicamento: 'generico' as const,
    ...overrides,
  });

  it('creates a product with its package composition', () => {
    const created = service.crear({
      ...crearParacetamol(),
    });

    expect(created.id).toBe(1);
    expect(created.obtenerUnidadesTotales()).toBe(40);
    expect(service.obtenerTodos()).toEqual([created]);
  });

  it('rejects a product with an empty name', () => {
    expect(() =>
      service.crear({
        ...crearParacetamol({ nombre: '  ' }),
      }),
    ).toThrow(BadRequestException);
  });

  it('identifies low stock by package count', () => {
    const product = service.crear({ ...crearParacetamol() });

    expect(product.tieneStockBajo()).toBe(true);
  });

  it('rejects package counts that do not match blister composition', () => {
    expect(() =>
      service.crear({ ...crearParacetamol({ unidadesPorPaquete: 10 }) }),
    ).toThrow(BadRequestException);
  });

  it('rejects a duplicate presentation and directs the user to add stock', () => {
    service.crear({ ...crearParacetamol() });

    expect(() => service.crear({ ...crearParacetamol() })).toThrow(
      ConflictException,
    );
  });

  it('adds incoming packages to the existing product', () => {
    const created = service.crear({ ...crearParacetamol() });
    const updated = service.agregarStock(created.id, 3);

    expect(updated.stock).toBe(5);
    expect(updated.obtenerUnidadesTotales()).toBe(100);
    expect(service.obtenerTodos()).toHaveLength(1);
  });

  it('keeps strength variants separate while finding them together by name', () => {
    service.crear({ ...crearParacetamol() });
    service.crear({
      ...crearParacetamol({ concentracion: '1 g', stock: 4 }),
    });

    expect(service.obtenerTodos('paracetamol')).toHaveLength(2);
    expect(service.obtenerTodos('500 mg')).toHaveLength(1);
  });

  it('supports personal care products without medicine fields', () => {
    const created = service.crear({
      nombre: 'Jabón líquido',
      categoria: 'higiene',
      precio: 8,
      stock: 4,
      stockMinimo: 2,
      presentacion: 'Frasco',
      unidadesPorPaquete: 1,
    });

    expect(created.concentracion).toBeNull();
    expect(created.obtenerUnidadesTotales()).toBe(4);
  });
});
