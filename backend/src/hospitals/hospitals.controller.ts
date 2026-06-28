import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HospitalsService } from './hospitals.service';

@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) { }

  @Get()
  getHospitals(@Query() query?: Record<string, any>) {
    return this.hospitalsService.getAllHospitals(query);
  }

  @Get(':id/history')
  getHospitalHistory(@Param('id') id: string) {
    return this.hospitalsService.getHospitalHistory(id);
  }

  @Get(':id/bed-allocations')
  getHospitalBedAllocations(@Param('id') id: string) {
    return this.hospitalsService.getHospitalBedAllocations(id);
  }

  @Get(':id')
  getHospital(@Param('id') id: string) {
    return this.hospitalsService.getHospitalById(id);
  }

  @Post()
  createHospital(@Body() body: Record<string, any>) {
    return this.hospitalsService.createHospital(body);
  }

  @Put(':id')
  updateHospital(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.hospitalsService.updateHospital(id, body);
  }

  @Delete(':id')
  deleteHospital(@Param('id') id: string) {
    return this.hospitalsService.deleteHospital(id);
  }
}
