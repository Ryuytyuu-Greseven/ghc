import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, Query, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) { }

  @Get()
  findAll() {
    return this.staffService.findAll();
  }

  @Get('by-hospital/:hospitalId')
  findByHospital(@Param('hospitalId') hospitalId: string) {
    return this.staffService.findByHospital(hospitalId);
  }

  @Get('available-doctors')
  getAvailableDoctors(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }
    return this.staffService.getAvailableDoctors(date);
  }

  @Get('me/availability')
  getAvailability(@Req() req: any) {
    const userId = req.user.userId;
    console.log(userId, "userIddddd i Geetttt")
    return this.staffService.getAvailability(userId);
  }

  @Put('me/availability')
  updateAvailability(
    @Req() req: any,
    @Body() body: { status: string; startDate?: string; endDate?: string }
  ) {
    const userId = req.user.userId;
    console.log("UserId in me/availability", userId)
    return this.staffService.updateAvailability(userId, body.status, body.startDate, body.endDate);
  }

  @Get('coverage-requests')
  getCoverageRequests() {
    return this.staffService.getCoverageRequests();
  }

  @Put('coverage-requests/:id/transfer')
  assignReplacement(
    @Param('id') requestId: string,
    @Body() body: { replacementStaffId: string }
  ) {
    return this.staffService.assignReplacement(requestId, body.replacementStaffId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.staffService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.staffService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staffService.remove(id);
  }
}
