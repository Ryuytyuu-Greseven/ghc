import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HospitalsService } from './hospitals.service';
import { FacilityAlertsService } from './facility-alerts/facility-alerts.service';
import { UsersService } from '../users/users.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';

@Controller('hospitals')
@UseGuards(JwtAuthGuard)
export class HospitalsController {
  constructor(
    private readonly hospitalsService: HospitalsService,
    private readonly facilityAlertsService: FacilityAlertsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('district/intervention-alerts')
  getInterventionAlerts(@Req() req: any) {
    const user = req.user;
    if (user.role !== 'Admin') {
      throw new ForbiddenException('Access denied. Admins only.');
    }
    return this.facilityAlertsService.getInterventionAlerts();
  }

  @Get()
  async getHospitals(@Req() req: any, @Query() query?: Record<string, any>) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    const filter = hospitalId
      ? {
          $or: [
            { hospitalId: hospitalId },
            { _id: new Types.ObjectId(hospitalId) },
          ],
        }
      : {};
    return this.hospitalsService.getAllHospitals(query, filter);
  }

  @Get(':id/history')
  async getHospitalHistory(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (hospitalId) {
      const targetHospital = await this.hospitalsService.getHospitalById(id);
      if (
        targetHospital.hospitalId !== hospitalId &&
        targetHospital._id.toString() !== hospitalId
      ) {
        throw new ForbiddenException('Access denied to this hospital history');
      }
    }
    return this.hospitalsService.getHospitalHistory(id);
  }

  @Get(':id/bed-allocations')
  async getHospitalBedAllocations(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (hospitalId) {
      const targetHospital = await this.hospitalsService.getHospitalById(id);
      if (
        targetHospital.hospitalId !== hospitalId &&
        targetHospital._id.toString() !== hospitalId
      ) {
        throw new ForbiddenException(
          'Access denied to this hospital bed allocations',
        );
      }
    }
    return this.hospitalsService.getHospitalBedAllocations(id);
  }

  @Get(':id')
  async getHospital(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (hospitalId) {
      const targetHospital = await this.hospitalsService.getHospitalById(id);
      if (
        targetHospital.hospitalId !== hospitalId &&
        targetHospital._id.toString() !== hospitalId
      ) {
        throw new ForbiddenException('Access denied to this hospital details');
      }
    }
    return this.hospitalsService.getHospitalById(id);
  }

  @Post()
  async createHospital(@Req() req: any, @Body() body: CreateHospitalDto) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Administrators can create hospitals');
    }
    return this.hospitalsService.createHospital(body, req.user.userId, req.user.username);
  }

  @Put(':id')
  async updateHospital(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateHospitalDto,
  ) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Administrators can update hospitals');
    }
    return this.hospitalsService.updateHospital(id, body, req.user.userId, req.user.username);
  }

  @Delete(':id')
  async deleteHospital(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Administrators can delete hospitals');
    }
    return this.hospitalsService.deleteHospital(id);
  }
}
