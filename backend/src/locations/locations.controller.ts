import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public } from '../auth/public.decorator';

@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Public()
  @Get('locations/migrate')
  async migrateLocations() {
    return this.locationsService.migrateOldData();
  }

  @Get('states')
  async getStates() {
    return this.locationsService.getStates();
  }

  @Get('districts')
  async getDistricts(@Query('stateId') stateId: string) {
    if (!stateId) {
      throw new BadRequestException('stateId query parameter is required');
    }
    return this.locationsService.getDistricts(stateId);
  }
}
