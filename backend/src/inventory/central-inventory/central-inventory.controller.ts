import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CentralInventoryService } from './central-inventory.service';

@Controller('central-inventory')
@UseGuards(JwtAuthGuard)
export class CentralInventoryController {
  constructor(private readonly service: CentralInventoryService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.service.findAll(query);
  }

  @Get('low-stock')
  findLowStock(@Query('threshold') threshold: string) {
    return this.service.findLowStock(threshold ? Number(threshold) : 50);
  }

  @Get('item/:itemId')
  findByItem(@Param('itemId') itemId: string) {
    return this.service.findByItem(itemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  addStock(@Body() body: Record<string, any>) {
    return this.service.addStock(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
