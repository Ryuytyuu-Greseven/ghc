import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BranchInventoryService } from './branch-inventory.service';

@Controller('branch-inventory')
@UseGuards(JwtAuthGuard)
export class BranchInventoryController {
  constructor(private readonly service: BranchInventoryService) {}

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId') branchId: string,
    @Query() query: Record<string, any>,
  ) {
    return this.service.findByBranch(branchId, query);
  }

  @Get('item/:itemId')
  findByItem(@Param('itemId') itemId: string) {
    return this.service.findByItem(itemId);
  }

  @Get('branch/:branchId/item/:itemId')
  findByBranchAndItem(
    @Param('branchId') branchId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.findByBranchAndItem(branchId, itemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.service.update(id, body);
  }

  @Get('branch/:branchId/category/:category')
  async findByBranchAndCategory(
    @Param('branchId') branchId: string,
    @Param('category') category: string,
  ) {
    return this.service.findByBranchAndCategory(branchId, category);
  }

  @Put('branch/:branchId/adjust')
  async adjustStock(
    @Param('branchId') branchId: string,
    @Body() body: { itemId: string; quantity: number; batchNo: string; expiryDate?: string },
  ) {
    const { itemId, quantity, batchNo, expiryDate } = body;
    return this.service.adjustStock(
      branchId,
      itemId,
      quantity,
      batchNo,
      expiryDate ? new Date(expiryDate) : null,
    );
  }
}
