import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryRequestsService } from './inventory-requests.service';

@Controller('inventory-requests')
@UseGuards(JwtAuthGuard)
export class InventoryRequestsController {
  constructor(private readonly service: InventoryRequestsService) {}

  @Get()
  findAll(@Query() query: Record<string, any>) {
    return this.service.findAll(query);
  }

  @Get('branch/:branchId')
  findByBranch(@Param('branchId') branchId: string) {
    return this.service.findByBranch(branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.service.create(body);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.approve(id, body);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.reject(id, body);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.updateStatus(id, body);
  }
}
