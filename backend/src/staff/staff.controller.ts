import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffService } from './staff.service';
import { UsersService } from '../users/users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AssignReplacementDto } from './dto/assign-replacement.dto';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly usersService: UsersService,
  ) { }

  @Get()
  async findAll(@Req() req: any, @Query() query?: Record<string, any>) {
    const user = req.user;
    const isDashboard = query?.dashboard === 'true';
    const scopedHospitalId = isDashboard
      ? await this.usersService.getAssignedHospitalId(user.userId, user.role)
      : null;
    const hospitalId = scopedHospitalId || query?.hospitalId;
    const status = query?.status as 'active' | 'inactive' | 'all' | undefined;

    return this.staffService.findFiltered({
      hospitalId,
      role: query?.role,
      status: status ?? 'active',
      name: query?.name,
    });
  }

  @Get('by-hospital/:hospitalId')
  async findByHospital(
    @Req() req: any,
    @Param('hospitalId') hospitalId: string,
  ) {
    const user = req.user;
    const userHospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (userHospitalId && userHospitalId !== hospitalId) {
      throw new ForbiddenException(
        'Access denied to other hospital staff list',
      );
    }
    return this.staffService.findByHospital(hospitalId);
  }

  @Get('available-doctors')
  getAvailableDoctors(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }
    return this.staffService.getAvailableDoctors(date);
  }

  @Get('available-nurses')
  getAvailableNurses(@Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }
    return this.staffService.getAvailableNurses(date);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    const staff = await this.staffService.findOne(id);
    if (
      hospitalId &&
      staff.hospitalId &&
      staff.hospitalId.toString() !== hospitalId
    ) {
      throw new ForbiddenException('Access denied to this staff member');
    }
    return staff;
  }

  @Get('me/availability')
  getAvailability(@Req() req: any) {
    const userId = req.user.userId;
    console.log(userId, 'userIddddd i Geetttt');
    return this.staffService.getAvailability(userId);
  }

  @Put('me/availability')
  updateAvailability(@Req() req: any, @Body() body: UpdateAvailabilityDto) {
    const userId = req.user.userId;
    console.log('UserId in me/availability', userId);
    return this.staffService.updateAvailability(
      userId,
      body.status,
      body.startDate,
      body.endDate,
    );
  }

  @Get('coverage-requests')
  getCoverageRequests() {
    return this.staffService.getCoverageRequests();
  }

  @Put('coverage-requests/:id/transfer')
  assignReplacement(
    @Param('id') requestId: string,
    @Body() body: AssignReplacementDto,
  ) {
    return this.staffService.assignReplacement(
      requestId,
      body.replacementStaffId,
    );
  }


  @Post()
  async create(@Req() req: any, @Body() body: CreateStaffDto) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (hospitalId) {
      body.hospitalId = hospitalId;
    }
    return this.staffService.create(body, user.userId, user.username);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
  ) {
    const user = req.user;
    const hospitalId = await this.usersService.getAssignedHospitalId(
      user.userId,
      user.role,
    );
    if (hospitalId) {
      const staff = await this.staffService.findOne(id);
      if (staff.hospitalId && staff.hospitalId.toString() !== hospitalId) {
        throw new ForbiddenException(
          'Access denied to update this staff member',
        );
      }
      body.hospitalId = hospitalId;
    }
    return this.staffService.update(id, body, user.userId, user.username);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Administrators can delete staff');
    }
    return this.staffService.remove(id);
  }
}
