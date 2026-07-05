import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { QueryService } from '../common/services/query.service';
import {
  DiagnosticTest,
  DiagnosticTestSchema,
} from '../schemas/diagnostic-test.schema';
import {
  FacilityTestAvailability,
  FacilityTestAvailabilitySchema,
} from '../schemas/facility-test-availability.schema';
import {
  TestAvailabilityAudit,
  TestAvailabilityAuditSchema,
} from '../schemas/test-availability-audit.schema';
import { DiagnosticTestRepository } from '../repositories/diagnostic-test.repository';
import { FacilityTestAvailabilityRepository } from '../repositories/facility-test-availability.repository';
import { TestAvailabilityAuditRepository } from '../repositories/test-availability-audit.repository';
import { DiagnosticTestCatalogController } from './diagnostic-test-catalog/diagnostic-test-catalog.controller';
import { DiagnosticTestCatalogService } from './diagnostic-test-catalog/diagnostic-test-catalog.service';
import { FacilityTestAvailabilityController } from './facility-test-availability/facility-test-availability.controller';
import { FacilityTestAvailabilityService } from './facility-test-availability/facility-test-availability.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: DiagnosticTest.name, schema: DiagnosticTestSchema },
      {
        name: FacilityTestAvailability.name,
        schema: FacilityTestAvailabilitySchema,
      },
      {
        name: TestAvailabilityAudit.name,
        schema: TestAvailabilityAuditSchema,
      },
    ]),
  ],
  controllers: [
    DiagnosticTestCatalogController,
    FacilityTestAvailabilityController,
  ],
  providers: [
    QueryService,
    DiagnosticTestRepository,
    FacilityTestAvailabilityRepository,
    TestAvailabilityAuditRepository,
    DiagnosticTestCatalogService,
    FacilityTestAvailabilityService,
  ],
  exports: [
    DiagnosticTestRepository,
    FacilityTestAvailabilityRepository,
    TestAvailabilityAuditRepository,
  ],
})
export class DiagnosticTestsModule {}
