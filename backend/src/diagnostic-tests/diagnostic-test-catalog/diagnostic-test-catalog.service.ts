import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiagnosticTestRepository } from '../../repositories/diagnostic-test.repository';
import { FacilityTestAvailabilityRepository } from '../../repositories/facility-test-availability.repository';
import {
  DiagnosticTestStatus,
  TestAvailabilityStatus,
} from '../../common/enums/diagnostic-test.enum';
import { buildPaginatedResponse } from '../../inventory/utils/pagination.util';
import { FacilityTestAvailabilityService } from '../facility-test-availability/facility-test-availability.service';

export interface FacilityAvailabilityInput {
  hospitalId: string;
  status: TestAvailabilityStatus;
  reason?: string;
}

@Injectable()
export class DiagnosticTestCatalogService {
  constructor(
    private readonly repo: DiagnosticTestRepository,
    private readonly availabilityRepo: FacilityTestAvailabilityRepository,
    private readonly availabilityService: FacilityTestAvailabilityService,
  ) {}

  async findAll(query: Record<string, any> = {}) {
    const { data, total, page, pageSize } =
      await this.repo.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
  }

  async findOne(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Diagnostic test ${id} not found`);

    const facilityAvailabilities = await this.availabilityRepo.findByTestId(id);
    return {
      ...item.toObject(),
      facilityAvailabilities: facilityAvailabilities.map((r) => ({
        hospitalId: r.hospitalId.toString(),
        status: r.status,
        reason: r.reason ?? '',
      })),
    };
  }

  async search(q: string) {
    return this.repo.search(q);
  }

  async findByCategory(category: string) {
    return this.repo.findByCategory(category);
  }

  async create(data: Record<string, any>, userId: string) {
    const { facilityAvailability, ...catalogData } = data;
    const test = await this.repo.create(catalogData);

    if (Array.isArray(facilityAvailability) && facilityAvailability.length) {
      await this.syncFacilityAvailability(
        test._id.toString(),
        facilityAvailability,
        userId,
      );
    }

    return test;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    const { facilityAvailability, ...catalogData } = data;
    const item = await this.repo.update(id, catalogData);
    if (!item) throw new NotFoundException(`Diagnostic test ${id} not found`);

    if (Array.isArray(facilityAvailability) && facilityAvailability.length) {
      await this.syncFacilityAvailability(id, facilityAvailability, userId);
    }

    return item;
  }

  async softDelete(id: string) {
    const item = await this.repo.update(id, {
      status: DiagnosticTestStatus.Inactive,
    });
    if (!item) throw new NotFoundException(`Diagnostic test ${id} not found`);
    return { id, deactivated: true };
  }

  private async syncFacilityAvailability(
    testId: string,
    entries: FacilityAvailabilityInput[],
    userId: string,
  ) {
    const seenHospitalIds = new Set<string>();

    for (const entry of entries) {
      if (!entry.hospitalId?.trim()) {
        throw new BadRequestException('hospitalId is required for each facility');
      }
      if (seenHospitalIds.has(entry.hospitalId)) {
        throw new BadRequestException('Duplicate facility in facilityAvailability');
      }
      seenHospitalIds.add(entry.hospitalId);

      if (
        entry.status !== TestAvailabilityStatus.Available &&
        !entry.reason?.trim()
      ) {
        throw new BadRequestException(
          'Reason is required when status is not Available',
        );
      }

      await this.availabilityService.updateAvailability(
        entry.hospitalId,
        testId,
        { status: entry.status, reason: entry.reason ?? '' },
        userId,
      );
    }
  }
}
