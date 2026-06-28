import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PatientDataService } from './patient-data.service';

@Controller('patient-data')
export class PatientDataController {
  constructor(private readonly patientDataService: PatientDataService) {}

  @Get('by-patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.patientDataService.findByPatient(patientId);
  }

  @Post()
  create(@Body() body: Record<string, any>) {
    return this.patientDataService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.patientDataService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientDataService.remove(id);
  }
}
