import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from './auth.service';
import { AuditLog } from '../schemas/audit-log.schema';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Username and password must be strings');
    }
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      throw new UnauthorizedException('Username and password cannot be empty');
    }
    const user = await this.authService.validateUser(cleanUsername, password);
    if (!user) {
      await this.auditLogModel.create({
        module: 'auth',
        action: 'LOGIN_FAILURE',
        message: `Failed login attempt for user "${cleanUsername}".`,
        performedBy: cleanUsername,
        performedByRole: 'Guest',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditLogModel.create({
      module: 'auth',
      action: 'LOGIN',
      message: `User "${user.username}" logged in successfully.`,
      performedBy: user.username,
      performedByRole: user.role,
    });

    return this.authService.login(user);
  }

  @Post('reset-password-direct')
  @HttpCode(HttpStatus.OK)
  async resetPasswordDirect(@Body() body: Record<string, any>) {
    const result = await this.authService.resetPasswordDirect(body);
    await this.auditLogModel.create({
      module: 'auth',
      action: 'PASSWORD_RESET_DIRECT',
      message: `User "${body.username}" reset their password directly.`,
      performedBy: body.username || 'System',
      performedByRole: 'Guest',
    });
    return result;
  }

  @Post('forgot-password/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: Record<string, any>) {
    const result = await this.authService.sendOtp(body);
    await this.auditLogModel.create({
      module: 'auth',
      action: 'FORGOT_PASSWORD_OTP_REQUEST',
      message: `Password reset OTP requested for identifier: "${body.identifier}".`,
      performedBy: body.identifier || 'System',
      performedByRole: 'Guest',
    });
    return result;
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: Record<string, any>) {
    const result = await this.authService.verifyOtp(body);
    await this.auditLogModel.create({
      module: 'auth',
      action: 'FORGOT_PASSWORD_OTP_VERIFY',
      message: `Password reset successfully via OTP for identifier: "${body.identifier}".`,
      performedBy: body.identifier || 'System',
      performedByRole: 'Guest',
    });
    return result;
  }
}
