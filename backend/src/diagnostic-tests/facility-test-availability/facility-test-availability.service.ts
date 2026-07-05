import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DiagnosticTestRepository } from '../../repositories/diagnostic-test.repository';
import { FacilityTestAvailabilityRepository } from '../../repositories/facility-test-availability.repository';
import { TestAvailabilityAuditRepository } from '../../repositories/test-availability-audit.repository';
import {
  DiagnosticTestStatus,
  TestAvailabilityStatus,
} from '../../common/enums/diagnostic-test.enum';
import { buildPaginatedResponse } from '../../inventory/utils/pagination.util';

@Injectable()
export class FacilityTestAvailabilityService {
  constructor(
    private readonly diagnosticTestRepo: DiagnosticTestRepository,
    private readonly availabilityRepo: FacilityTestAvailabilityRepository,
    private readonly auditRepo: TestAvailabilityAuditRepository,
  ) {}

  async getByHospital(hospitalId: string) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new BadRequestException('hospitalId is invalid');
    }

    const [catalogTests, availabilityRecords] = await Promise.all([
      this.diagnosticTestRepo.findAll({ status: DiagnosticTestStatus.Active }),
      this.availabilityRepo.findByHospital(hospitalId),
    ]);

    const availabilityMap = new Map(
      availabilityRecords.map((r) => {
        const testIdKey =
          (r.testId as { _id?: { toString(): string } })?._id?.toString?.() ??
          r.testId?.toString?.();
        return [testIdKey, r];
      }),
    );

    return catalogTests.map((test) => {
      const testId = test._id.toString();
      const record = availabilityMap.get(testId);
      const hasRecord = !!record;
      return {
        testId,
        testName: test.testName,
        testCode: test.testCode,
        category: test.category,
        sampleType: test.sampleType,
        status: hasRecord
          ? record!.status
          : ('NotAudited' as const),
        reason: record?.reason ?? '',
        lastAuditedAt: record?.lastAuditedAt ?? null,
        availabilityId: record?._id?.toString() ?? null,
      };
    });
  }

  async updateAvailability(
    hospitalId: string,
    testId: string,
    data: Record<string, any>,
    userId: string,
  ) {
    if (!Types.ObjectId.isValid(hospitalId)) {
      throw new BadRequestException('hospitalId is invalid');
    }
    if (!Types.ObjectId.isValid(testId)) {
      throw new BadRequestException('testId is invalid');
    }

    const test = await this.diagnosticTestRepo.findById(testId);
    if (!test || test.status !== DiagnosticTestStatus.Active) {
      throw new NotFoundException(`Diagnostic test ${testId} not found`);
    }

    const status = data.status as TestAvailabilityStatus;
    const writableStatuses = [
      TestAvailabilityStatus.Available,
      TestAvailabilityStatus.Unavailable,
      TestAvailabilityStatus.Partial,
      TestAvailabilityStatus.OutOfOrder,
    ];
    if (!writableStatuses.includes(status)) {
      throw new BadRequestException('Invalid availability status');
    }

    if (
      status !== TestAvailabilityStatus.Available &&
      !data.reason?.trim()
    ) {
      throw new BadRequestException(
        'Reason is required when status is not Available',
      );
    }

    const existing = await this.availabilityRepo.findByHospitalAndTest(
      hospitalId,
      testId,
    );
    const isFirstRecord = !existing;
    const previousStatus =
      existing?.status ?? TestAvailabilityStatus.NotAudited;
    const trimmedReason = data.reason?.trim() ?? '';

    const now = new Date();
    const auditedBy = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : undefined;

    const record = await this.availabilityRepo.upsertByHospitalAndTest(
      hospitalId,
      testId,
      {
        status,
        reason: trimmedReason,
        lastAuditedAt: now,
        lastAuditedBy: auditedBy,
      },
    );

    const reasonChanged = existing
      ? (existing.reason ?? '') !== trimmedReason
      : false;

    if (isFirstRecord || previousStatus !== status || reasonChanged) {
      await this.auditRepo.create({
        hospitalId: new Types.ObjectId(hospitalId),
        testId: new Types.ObjectId(testId),
        previousStatus,
        newStatus: status,
        reason: trimmedReason,
        auditedBy,
        auditedAt: now,
      });
    }

    return record;
  }

  async getAuditLog(query: Record<string, any> = {}) {
    const { data, total, page, pageSize } =
      await this.auditRepo.findPaginated(query);
    return buildPaginatedResponse(data, total, page, pageSize);
  }

  assertHospitalAccess(
    userRole: string,
    userHospitalId: string | null,
    targetHospitalId: string,
  ) {
    if (userRole === 'Admin') return;
    if (!userHospitalId || userHospitalId !== targetHospitalId) {
      throw new ForbiddenException('Access denied to this facility');
    }
  }
}
