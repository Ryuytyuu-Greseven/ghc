import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: Record<string, any>) {
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
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}
