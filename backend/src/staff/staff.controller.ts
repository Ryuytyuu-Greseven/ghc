import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { StaffService } from './staff.service';

@Controller('staff')
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
