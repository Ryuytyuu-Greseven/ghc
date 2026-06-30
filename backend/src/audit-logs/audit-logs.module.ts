import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { QueryService } from '../common/services/query.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [AuditLogsController],
  providers: [QueryService, AuditLogRepository, AuditLogsService],
  exports: [AuditLogRepository, AuditLogsService],
})
export class AuditLogsModule {}
