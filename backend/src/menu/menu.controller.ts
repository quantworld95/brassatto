import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSideDishDto } from './dto/create-side-dish.dto';
import { UpdateSideDishDto } from './dto/update-side-dish.dto';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('categories')
  @ApiOperation({ summary: 'Crear nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.menuService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas las categorías' })
  @ApiResponse({ status: 200, description: 'Lista de categorías' })
  findAllCategories() {
    return this.menuService.findAllCategories();
  }

  @Get('categories/:id/products')
  @ApiOperation({ summary: 'Obtener productos de una categoría' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la categoría' })
  @ApiResponse({ status: 200, description: 'Lista de productos de la categoría' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findProductsByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findProductsByCategoryId(id);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Obtener categoría por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID de la categoría' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findCategoryById(id);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.removeCategory(id);
  }

  @Post('products')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.menuService.createProduct(createProductDto);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar todos los productos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  findAllProducts() {
    return this.menuService.findAllProducts();
  }

  @Get('products/best-sellers')
  @ApiOperation({ summary: 'Obtener productos más vendidos' })
  @ApiResponse({ status: 200, description: 'Lista de productos más vendidos' })
  findBestSellerProducts() {
    return this.menuService.findBestSellerProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findProductById(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findProductById(id);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.menuService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.removeProduct(id);
  }

  @Post('side-dishes')
  createSideDish(@Body() createSideDishDto: CreateSideDishDto) {
    return this.menuService.createSideDish(createSideDishDto);
  }

  @Get('side-dishes')
  findAllSideDishes() {
    return this.menuService.findAllSideDishes();
  }

  @Get('side-dishes/:id')
  findSideDishById(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findSideDishById(id);
  }

  @Patch('side-dishes/:id')
  updateSideDish(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSideDishDto: UpdateSideDishDto,
  ) {
    return this.menuService.updateSideDish(id, updateSideDishDto);
  }

  @Delete('side-dishes/:id')
  removeSideDish(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.removeSideDish(id);
  }
}

