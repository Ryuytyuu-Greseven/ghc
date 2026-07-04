import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryRequestsService } from './inventory-requests.service';
import { CreateInventoryRequestDto } from './dto/create-inventory-request.dto';
import { ApproveInventoryRequestDto } from './dto/approve-inventory-request.dto';
import { RejectInventoryRequestDto } from './dto/reject-inventory-request.dto';
import { UpdateInventoryRequestStatusDto } from './dto/update-inventory-request-status.dto';

@Controller('inventory-requests')
@UseGuards(JwtAuthGuard)
export class InventoryRequestsController {
  constructor(private readonly service: InventoryRequestsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: Record<string, any>) {
    return this.service.findAll(query, req.user);
  }

  @Get('branch/:branchId')
  findByBranch(@Req() req: any, @Param('branchId') branchId: string) {
    return this.service.findByBranch(branchId, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateInventoryRequestDto) {
    return this.service.create(body, req.user);
  }

  @Put(':id/approve')
  approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ApproveInventoryRequestDto,
  ) {
    return this.service.approve(id, body, req.user);
  }

  @Put(':id/reject')
  reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: RejectInventoryRequestDto,
  ) {
    return this.service.reject(id, body, req.user);
  }

  @Put(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateInventoryRequestStatusDto,
  ) {
    return this.service.updateStatus(id, body, req.user);
  }
}
