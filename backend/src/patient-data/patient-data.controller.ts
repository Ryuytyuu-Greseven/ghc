import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PatientDataService } from './patient-data.service';
import { CreatePatientDataDto } from './dto/create-patient-data.dto';
import { UpdatePatientDataDto } from './dto/update-patient-data.dto';

@Controller('patient-data')
export class PatientDataController {
  private readonly logger = new Logger(PatientDataController.name);

  constructor(private readonly patientDataService: PatientDataService) {}

  @Get('by-patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.patientDataService.findByPatient(patientId);
  }

  @Post()
  create(@Body() body: CreatePatientDataDto) {
    return this.patientDataService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdatePatientDataDto) {
    return this.patientDataService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.patientDataService.remove(id);
  }

  @Post('ai-visit-suggestions')
  async getAiVisitSuggestions(@Body('problem') problem: string) {
    return this.patientDataService.getVisitSuggestions(problem);
  }

  @Post('ai-prescription-validation')
  async getAiPrescriptionValidation(@Body() body: { diagnosis: string; medicines: { name: string; quantity: number }[] }) {
    return this.patientDataService.getPrescriptionValidation(body);
  }

  @Post('send-prescription-email')
  async sendPrescriptionEmail(@Body() body: {
    patientName: string;
    patientEmail: string;
    problem: string;
    visits: any[];
  }) {
    this.logger.log(`Sending prescription email to: ${body?.patientEmail}, visits count: ${body?.visits?.length}`);
    try {
      return await this.patientDataService.sendPrescriptionEmail(body);
    } catch (err) {
      this.logger.error('Failed to send prescription email', err?.stack ?? err?.message ?? err);
      throw new InternalServerErrorException(`Email send failed: ${err?.message ?? 'Unknown error'}`);
    }
  }
}
