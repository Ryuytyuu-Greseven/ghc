import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  findAll() {
    return this.medicinesService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.medicinesService.findAvailable();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.medicinesService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicinesService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.medicinesService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.medicinesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicinesService.remove(id);
  }
}
