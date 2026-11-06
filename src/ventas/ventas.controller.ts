import { Body, Controller, Get, Post } from '@nestjs/common';
import { CrearVentaDto } from './dto/crear-venta.dto.js';
import { Venta } from './venta.entity.js';
import { VentasService } from './ventas.service.js';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get()
  obtenerTodas(): Venta[] {
    return this.ventasService.obtenerTodas();
  }

  @Post()
  crear(@Body() datos: CrearVentaDto): Venta {
    return this.ventasService.crear(datos);
  }
}
