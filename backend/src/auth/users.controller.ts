import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { CurrentUser, CurrentUserPayload } from '@common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private authService: AuthService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    this.logger.log(`[Users] Fetching profile for ${user.userId}`);
    return this.authService.getProfile(user.userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: { name?: string; email?: string; language?: string }
  ) {
    this.logger.log(`[Users] Updating profile for ${user.userId}`);
    return this.authService.updateProfile(user.userId, data);
  }
}
