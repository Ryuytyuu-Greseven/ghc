import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { UsersService } from '../users/users.service';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async search(@Req() req: any, @Body() body: SearchPatientsDto = {}) {
    const query = await this.applyHospitalScope(req, body);
    return this.patientsService.findAll(query);
  }

  @Get()
  async findAll(@Req() req: any) {
    const hospitalId = await this.getAssignedHospitalId(req);
    const filter = hospitalId ? { hospitalId: new Types.ObjectId(hospitalId) } : {};
    return this.patientsService.findAllList(filter);
  }

  @Get('by-hospital/:hospitalId')
  async findByHospital(@Req() req: any, @Param('hospitalId') hospitalId: string) {
    const user = req.user;
    const userHospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    if (userHospitalId && userHospitalId !== hospitalId) {
      throw new ForbiddenException('Access denied to other hospital patient list');
    }
    return this.patientsService.findByHospital(hospitalId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    const patient = await this.patientsService.findOne(id);
    if (hospitalId && patient.hospitalId && patient.hospitalId.toString() !== hospitalId) {
      throw new ForbiddenException('Access denied to this patient record');
    }
    return patient;
  }

  @Post('create')
  async create(@Req() req: any, @Body() body: CreatePatientDto) {
    return this.createPatient(req, body);
  }

  private async createPatient(req: any, body: CreatePatientDto) {
    const user = req.user;
    if (user.role === 'Admin') {
      throw new ForbiddenException('Administrators are not allowed to add patients');
    }
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    if (hospitalId) {
      body.hospitalId = hospitalId;
    }
    return this.patientsService.create(body);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: UpdatePatientDto) {
    const user = req.user;
    if (user.role === 'Admin') {
      throw new ForbiddenException('Administrators are not allowed to edit patients');
    }
    const hospitalId = await this.usersService.getAssignedHospitalId(user.userId, user.role);
    if (hospitalId) {
      const patient = await this.patientsService.findOne(id);
      if (patient.hospitalId && patient.hospitalId.toString() !== hospitalId) {
        throw new ForbiddenException('Access denied to update this patient record');
      }
      body.hospitalId = hospitalId;
    }
    return this.patientsService.update(id, body);
  }

  private async applyHospitalScope(req: any, query: SearchPatientsDto) {
    const hospitalId = await this.getAssignedHospitalId(req);
    return hospitalId ? { ...query, hospitalId } : query;
  }

  private async getAssignedHospitalId(req: any) {
    const user = req.user;
    return this.usersService.getAssignedHospitalId(user.userId, user.role);
  }
}
