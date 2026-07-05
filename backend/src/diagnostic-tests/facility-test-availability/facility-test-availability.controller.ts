import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FacilityTestAvailabilityService } from './facility-test-availability.service';
import { UsersService } from '../../users/users.service';

@Controller('facility-test-availability')
@UseGuards(JwtAuthGuard)
export class FacilityTestAvailabilityController {
  constructor(
    private readonly service: FacilityTestAvailabilityService,
    private readonly usersService: UsersService,
  ) {}

  @Get('audit-log')
  async getAuditLog(@Req() req: any, @Query() query: Record<string, any>) {
    const userHospitalId = await this.getAssignedHospitalId(req);
    if (userHospitalId) {
      query.hospitalId = userHospitalId;
    }
    return this.service.getAuditLog(query);
  }

  @Get('hospital/:hospitalId')
  async getByHospital(
    @Req() req: any,
    @Param('hospitalId') hospitalId: string,
  ) {
    await this.assertHospitalAccess(req, hospitalId);
    return this.service.getByHospital(hospitalId);
  }

  @Put('hospital/:hospitalId/test/:testId')
  async updateAvailability(
    @Req() req: any,
    @Param('hospitalId') hospitalId: string,
    @Param('testId') testId: string,
    @Body() body: Record<string, any>,
  ) {
    await this.assertHospitalAccess(req, hospitalId);
    const user = req.user;
    return this.service.updateAvailability(
      hospitalId,
      testId,
      body,
      user.userId,
    );
  }

  private async assertHospitalAccess(req: any, hospitalId: string) {
    const user = req.user;
    const userHospitalId = await this.getAssignedHospitalId(req);
    this.service.assertHospitalAccess(user.role, userHospitalId, hospitalId);
  }

  private async getAssignedHospitalId(req: any) {
    const user = req.user;
    return this.usersService.getAssignedHospitalId(user.userId, user.role);
  }
}
