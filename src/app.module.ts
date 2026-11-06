import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProductosModule } from './productos/productos.module.js';
import { VentasModule } from './ventas/ventas.module.js';

@Module({
  imports: [ProductosModule, VentasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
