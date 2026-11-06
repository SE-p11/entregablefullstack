import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AgregarStockDto } from './dto/agregar-stock.dto.js';
import { CrearProductoDto } from './dto/crear-producto.dto.js';
import { Producto } from './producto.entity.js';
import { ProductosService } from './productos.service.js';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  obtenerTodos(@Query('buscar') buscar = ''): Producto[] {
    return this.productosService.obtenerTodos(buscar);
  }

  @Post()
  crear(@Body() datos: CrearProductoDto): Producto {
    return this.productosService.crear(datos);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: CrearProductoDto,
  ): Producto {
    return this.productosService.actualizar(id, datos);
  }

  @Patch(':id/stock')
  agregarStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: AgregarStockDto,
  ): Producto {
    return this.productosService.agregarStock(id, datos.cantidad);
  }
}
