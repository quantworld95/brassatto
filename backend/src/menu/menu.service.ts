import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSideDishDto } from './dto/create-side-dish.dto';
import { UpdateSideDishDto } from './dto/update-side-dish.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findProductsByCategoryId(categoryId: number) {
    await this.findCategoryById(categoryId);
    return this.prisma.product.findMany({
      where: {
        categoryId,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: [
        { isBestSeller: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(id: number, updateCategoryDto: UpdateCategoryDto) {
    await this.findCategoryById(id);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async removeCategory(id: number) {
    await this.findCategoryById(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async createProduct(createProductDto: CreateProductDto) {
    await this.findCategoryById(createProductDto.categoryId);
    return this.prisma.product.create({
      data: createProductDto,
      include: {
        category: true,
      },
    });
  }

  async findAllProducts() {
    return this.prisma.product.findMany({
      where: {
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: [
        { isBestSeller: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findBestSellerProducts() {
    return this.prisma.product.findMany({
      where: {
        isBestSeller: true,
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async updateProduct(id: number, updateProductDto: UpdateProductDto) {
    await this.findProductById(id);
    
    if (updateProductDto.categoryId) {
      await this.findCategoryById(updateProductDto.categoryId);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: true,
      },
    });
  }

  async removeProduct(id: number) {
    await this.findProductById(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }

  async createSideDish(createSideDishDto: CreateSideDishDto) {
    return this.prisma.sideDish.create({
      data: createSideDishDto,
    });
  }

  async findAllSideDishes() {
    return this.prisma.sideDish.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async validateSideDishes(sideDishIds: number[]): Promise<void> {
    if (!sideDishIds || sideDishIds.length === 0) {
      return;
    }

    const sideDishes = await this.prisma.sideDish.findMany({
      where: {
        id: { in: sideDishIds },
      },
    });

    if (sideDishes.length !== sideDishIds.length) {
      const foundIds = sideDishes.map((sd) => sd.id);
      const invalidIds = sideDishIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Side dishes with IDs ${invalidIds.join(', ')} not found`,
      );
    }
  }

  async findSideDishById(id: number) {
    const sideDish = await this.prisma.sideDish.findUnique({
      where: { id },
    });

    if (!sideDish) {
      throw new NotFoundException(`Side dish with ID ${id} not found`);
    }

    return sideDish;
  }

  async updateSideDish(id: number, updateSideDishDto: UpdateSideDishDto) {
    await this.findSideDishById(id);
    return this.prisma.sideDish.update({
      where: { id },
      data: updateSideDishDto,
    });
  }

  async removeSideDish(id: number) {
    await this.findSideDishById(id);
    return this.prisma.sideDish.delete({
      where: { id },
    });
  }
}

