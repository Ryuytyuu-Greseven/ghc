import { Controller, Get, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: Record<string, any>) {
    // Only Admin can query arbitrary audit logs.
    // Non-admins (like Pharmacists) are only allowed to view 'inventory' module logs.
    if (req.user.role !== 'Admin' && query.module !== 'inventory') {
      throw new ForbiddenException('Only Administrators are allowed to view general audit logs');
    }
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'Admin') {
      // Non-admins can view a specific log only if it belongs to the inventory module.
      return this.service.findOne(id).then((log) => {
        if (log.module !== 'inventory') {
          throw new ForbiddenException('Only Administrators are allowed to view this audit log');
        }
        return log;
      });
    }
    return this.service.findOne(id);
  }
}
