import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryTransactionsService } from './inventory-transactions.service';

@Controller('inventory-transactions')
@UseGuards(JwtAuthGuard)
export class InventoryTransactionsController {
  constructor(private readonly service: InventoryTransactionsService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.service.findAll(query);
  }

  @Get('item/:itemId')
  findByItem(@Param('itemId') itemId: string) {
    return this.service.findByItem(itemId);
  }

  @Get('location/:location')
  findByLocation(@Param('location') location: string) {
    return this.service.findByLocation(location);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
