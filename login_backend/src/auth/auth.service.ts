import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { Staff } from '../schemas/staff.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Staff.name)
    private readonly staffModel: Model<Staff>,
  ) {
    this.fromAddress = this.configService.get<string>('SMTP_FROM') ?? 'noreply@ghc.health';
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: this.configService.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } else {
      this.logger.warn('SMTP_HOST not configured for login_backend — emails will log to console');
    }
  }

  async validateUser(username: string, pass: string): Promise<any> {
    if (typeof username !== 'string' || typeof pass !== 'string') {
      return null;
    }
    const user = await this.usersService.findOneByUsername(username);
    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        const { passwordHash, ...result } = user.toObject
          ? user.toObject()
          : user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async resetPasswordDirect(body: any) {
    const { username, oldPassword, newPassword } = body;
    if (!username || !oldPassword || !newPassword) {
      throw new BadRequestException('All fields (username, oldPassword, newPassword) are required');
    }
    const user = await this.usersService.findOneByUsername(username);
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or inactive');
    }
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect old password');
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await this.usersService.update(user._id.toString(), { passwordHash });
    return { success: true, message: 'Password updated successfully' };
  }

  async sendOtp(body: any) {
    const { identifier } = body;
    if (!identifier) {
      throw new BadRequestException('Username or email is required');
    }

    let user: any = null;
    let email = '';

    const isEmail = identifier.includes('@');
    if (isEmail) {
      const cleanEmail = identifier.trim().toLowerCase();
      const staff = await this.staffModel.findOne({ email: cleanEmail }).exec();
      if (!staff) {
        throw new NotFoundException('No staff record found with the registered email');
      }
      user = await this.usersService.findOneByFilter({ _id: staff.userId });
      if (!user || !user.isActive) {
        throw new NotFoundException('User associated with this email is not found or inactive');
      }
      email = cleanEmail;
    } else {
      user = await this.usersService.findOneByUsername(identifier);
      if (!user || !user.isActive) {
        throw new NotFoundException('User not found or inactive');
      }
      const staff = await this.staffModel.findOne({ userId: user._id }).exec();
      if (staff && staff.email) {
        email = staff.email.trim().toLowerCase();
      } else if (user.email) {
        email = user.email.trim().toLowerCase();
      } else {
        throw new BadRequestException('No registered email found for this user');
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.update(user._id.toString(), {
      otpCode,
      otpExpires,
    });

    const obfuscatedEmail = email.replace(/(..)(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c);

    let emailSent = false;
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: email,
          subject: 'GHC Portal Password Reset OTP',
          text: `Your password reset One-Time Password (OTP) is: ${otpCode}. It is valid for 10 minutes.`,
          html: `<p>Your password reset One-Time Password (OTP) is: <strong>${otpCode}</strong>.</p><p>It is valid for 10 minutes.</p>`,
        });
        emailSent = true;
      } catch (err) {
        this.logger.error(`Failed to send email to ${email}: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`\n======================================================`);
    console.log(`[OTP DEV LOG] OTP for user "${user.username}" (${email}) is: ${otpCode}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      email: obfuscatedEmail,
      emailSent,
      message: 'OTP sent to registered email successfully',
    };
  }

  async verifyOtp(body: any) {
    const { identifier, otp, newPassword } = body;
    if (!identifier || !otp || !newPassword) {
      throw new BadRequestException('All fields (identifier, otp, newPassword) are required');
    }

    let user: any = null;
    const isEmail = identifier.includes('@');
    if (isEmail) {
      const cleanEmail = identifier.trim().toLowerCase();
      const staff = await this.staffModel.findOne({ email: cleanEmail }).exec();
      if (!staff) {
        throw new NotFoundException('No staff record found with the registered email');
      }
      user = await this.usersService.findOneByFilter({ _id: staff.userId });
    } else {
      user = await this.usersService.findOneByUsername(identifier);
    }

    if (!user || !user.isActive) {
      throw new NotFoundException('User not found or inactive');
    }

    if (!user.otpCode || !user.otpExpires) {
      throw new BadRequestException('No active OTP request found for this user');
    }

    if (new Date() > new Date(user.otpExpires)) {
      throw new BadRequestException('OTP has expired');
    }

    if (user.otpCode !== otp.trim()) {
      throw new BadRequestException('Invalid OTP code');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.usersService.update(user._id.toString(), {
      passwordHash,
      $unset: { otpCode: 1, otpExpires: 1 },
    });

    return { success: true, message: 'Password reset successfully with OTP' };
  }
}
