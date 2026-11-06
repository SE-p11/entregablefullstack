import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(join(process.cwd(), 'public'));
    await app.init();
  });

  it('/ (GET) serves the inventory view', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect((response) => {
        expect(response.text).toContain('Inventario de botica');
      });
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/productos (POST and GET)', async () => {
    await request(app.getHttpServer())
      .post('/productos')
      .send({
        nombre: 'Paracetamol',
        categoria: 'medicamento',
        precio: 4.5,
        stock: 2,
        stockMinimo: 3,
        presentacion: 'Caja',
        blistersPorPaquete: 2,
        unidadesPorBlister: 10,
        unidadesPorPaquete: 20,
        concentracion: '500 mg',
        tipoMedicamento: 'generico',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 1,
          nombre: 'Paracetamol',
          categoria: 'medicamento',
          precio: 4.5,
          stock: 2,
          stockMinimo: 3,
          presentacion: 'Caja',
          blistersPorPaquete: 2,
          unidadesPorBlister: 10,
          unidadesPorPaquete: 20,
          concentracion: '500 mg',
          tipoMedicamento: 'generico',
        });
      });

    await request(app.getHttpServer())
      .get('/productos')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].stock).toBe(2);
        expect(body[0].unidadesPorPaquete).toBe(20);
      });

    await request(app.getHttpServer())
      .get('/productos?buscar=500%20mg')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].concentracion).toBe('500 mg');
      });

    await request(app.getHttpServer())
      .patch('/productos/1')
      .send({
        nombre: 'Paracetamol',
        categoria: 'medicamento',
        precio: 5,
        stock: 2,
        stockMinimo: 3,
        presentacion: 'Caja',
        blistersPorPaquete: 2,
        unidadesPorBlister: 10,
        unidadesPorPaquete: 20,
        concentracion: '500 mg',
        tipoMedicamento: 'generico',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.precio).toBe(5);
        expect(body.id).toBe(1);
      });

    return request(app.getHttpServer())
      .patch('/productos/1/stock')
      .send({ cantidad: 3 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.stock).toBe(5);
        expect(body.id).toBe(1);
      });
  });

  it('/productos rejects an already registered presentation', async () => {
    const producto = {
      nombre: 'Paracetamol',
      categoria: 'medicamento',
      precio: 4.5,
      stock: 2,
      stockMinimo: 3,
      presentacion: 'Caja',
      blistersPorPaquete: 2,
      unidadesPorBlister: 10,
      unidadesPorPaquete: 20,
      concentracion: '500 mg',
      tipoMedicamento: 'generico',
    };

    await request(app.getHttpServer())
      .post('/productos')
      .send(producto)
      .expect(201);
    return request(app.getHttpServer())
      .post('/productos')
      .send(producto)
      .expect(409);
  });

  it('/productos (POST rejects invalid data)', () => {
    return request(app.getHttpServer())
      .post('/productos')
      .send({
        nombre: ' ',
        categoria: 'medicamento',
        precio: 4.5,
        stock: 12,
        stockMinimo: 3,
        presentacion: 'Caja',
        unidadesPorPaquete: 1,
        concentracion: '500 mg',
        tipoMedicamento: 'generico',
        blistersPorPaquete: 1,
        unidadesPorBlister: 1,
      })
      .expect(400);
  });

  it('/ventas (POST records sales, updates stock, and GET returns history)', async () => {
    await request(app.getHttpServer())
      .post('/productos')
      .send({
        nombre: 'Paracetamol',
        categoria: 'medicamento',
        precio: 4.5,
        stock: 2,
        stockMinimo: 1,
        presentacion: 'Caja',
        unidadesPorPaquete: 20,
        concentracion: '500 mg',
        tipoMedicamento: 'generico',
        blistersPorPaquete: 2,
        unidadesPorBlister: 10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/ventas')
      .send({
        items: [{ productoId: 1, cantidad: 3, unidad: 'unidad' }],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.total).toBe(0.68);
        expect(body.detalles[0]).toMatchObject({
          productoId: 1,
          cantidad: 3,
          unidad: 'unidad',
          unidadesDescontadas: 3,
        });
      });

    await request(app.getHttpServer())
      .get('/productos')
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].stock).toBe(1);
        expect(body[0].unidadesSueltas).toBe(17);
      });

    return request(app.getHttpServer())
      .get('/ventas')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].total).toBe(0.68);
      });
  });

  it('/ventas rejects insufficient stock without creating a sale', async () => {
    await request(app.getHttpServer())
      .post('/productos')
      .send({
        nombre: 'Paracetamol',
        categoria: 'medicamento',
        precio: 4.5,
        stock: 1,
        stockMinimo: 1,
        presentacion: 'Caja',
        unidadesPorPaquete: 10,
        concentracion: '500 mg',
        tipoMedicamento: 'generico',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/ventas')
      .send({ items: [{ productoId: 1, cantidad: 11, unidad: 'unidad' }] })
      .expect(409);

    return request(app.getHttpServer())
      .get('/ventas')
      .expect(200)
      .expect([]);
  });

  afterEach(async () => {
    await app.close();
  });
});
