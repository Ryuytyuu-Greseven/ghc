import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { BranchInventoryService } from './branch-inventory.service';

@Controller('branch-inventory')
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
}
