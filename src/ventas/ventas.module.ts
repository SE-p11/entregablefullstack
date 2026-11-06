import { Module } from '@nestjs/common';
import { ProductosModule } from '../productos/productos.module.js';
import { VentasController } from './ventas.controller.js';
import { VentasService } from './ventas.service.js';

@Module({
  imports: [ProductosModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
