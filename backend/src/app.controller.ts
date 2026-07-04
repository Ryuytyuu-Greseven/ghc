import {
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuditLogsService } from './audit-logs/audit-logs.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const user = req.user;
    if (user) {
      await this.auditLogsService.log({
        module: 'auth',
        action: 'LOGOUT',
        message: `User "${user.username}" logged out successfully.`,
        performedBy: user.username,
        performedByRole: user.role,
        metadata: {
          userId: user.userId,
        },
      });
    }
    return { success: true };
  }
}
