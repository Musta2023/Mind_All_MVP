import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Get,
  UnauthorizedException,
  Patch,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from '@common/guards/jwt.guard';
import { CurrentUser, CurrentUserPayload } from '@common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {
    this.logger.log('AuthController initialized');
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Set refresh token as HTTP-only cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set refresh token as HTTP-only cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  async refresh(
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = response.req?.cookies?.['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    // Fetch fresh user data from DB to ensure name is up to date even if JWT is stale
    const freshUser = await this.authService.getProfile(user.userId);
    return {
      id: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      tenantId: user.tenantId,
      role: freshUser.role,
    };
  }
}
