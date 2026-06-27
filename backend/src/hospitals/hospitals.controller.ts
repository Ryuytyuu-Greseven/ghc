import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get()
  getHospitals() {
    return this.hospitalsService.getAllHospitals();
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
