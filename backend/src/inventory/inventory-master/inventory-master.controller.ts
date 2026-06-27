import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { InventoryMasterService } from './inventory-master.service';

@Controller('inventory-master')
export class InventoryMasterController {
  constructor(private readonly service: InventoryMasterService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.service.findAll(query);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q ?? '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
