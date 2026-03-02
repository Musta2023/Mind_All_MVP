import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import {
  CurrentUser,
  CurrentTenant,
  CurrentUserPayload,
} from '@common/decorators/current-user.decorator';
import { StartupService } from './startup.service';
import { BriefingService } from '../ai/briefing.service';
import { CreateStartupDto, UpdateStartupDto } from './dto/create-startup.dto';

@Controller('startup')
@UseGuards(JwtGuard, TenantGuard)
export class StartupController {
  constructor(
    private startupService: StartupService,
    private briefingService: BriefingService,
  ) {}

  @Get('briefing')
  async getLatestBriefing(@CurrentTenant() tenantId: string) {
    return this.briefingService.getLatestBriefing(tenantId);
  }

  @Post('profile')
  async createProfile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createStartupDto: CreateStartupDto,
  ) {
    return this.startupService.createOrUpdate(
      tenantId,
      user.userId,
      createStartupDto,
    );
  }

  @Get('profile')
  async getProfile(@CurrentTenant() tenantId: string) {
    return this.startupService.getProfile(tenantId);
  }

  @Get('dashboard')
  async getDashboardSummary(@CurrentTenant() tenantId: string) {
    return this.startupService.getDashboardSummary(tenantId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentTenant() tenantId: string,
    @Body() updateDto: UpdateStartupDto,
  ) {
    return this.startupService.updateProfile(tenantId, updateDto);
  }

  @Post('goals')
  async createGoal(
    @CurrentTenant() tenantId: string,
    @Body()
    goalData: {
      title: string;
      deadline: Date;
      metrics: Record<string, any>;
      priority: number;
    },
  ) {
    return this.startupService.createGoal(tenantId, goalData);
  }

  @Get('goals')
  async getGoals(@CurrentTenant() tenantId: string) {
    return this.startupService.getGoals(tenantId);
  }

  @Patch('goals/:id')
  async updateGoal(
    @CurrentTenant() tenantId: string,
    @Param('id') goalId: string,
    @Body()
    goalData: Partial<{
      title: string;
      deadline: Date;
      metrics: Record<string, any>;
      priority: number;
    }>,
  ) {
    return this.startupService.updateGoal(tenantId, goalId, goalData);
  }

  @Delete('goals/:id')
  async deleteGoal(
    @CurrentTenant() tenantId: string,
    @Param('id') goalId: string,
  ) {
    return this.startupService.deleteGoal(tenantId, goalId);
  }

  // ============ TASK MANAGEMENT (LEVEL 4) ============

  @Post('tasks')
  async createTask(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    taskData: {
      title: string;
      description?: string;
      status?: any;
      priority?: number;
      dueDate?: Date;
      goalId?: string;
    },
  ) {
    return this.startupService.createTask(tenantId, user.userId, taskData);
  }

  @Get('tasks')
  async getTasks(@CurrentTenant() tenantId: string) {
    return this.startupService.getTasks(tenantId);
  }

  @Patch('tasks/:id')
  async updateTask(
    @CurrentTenant() tenantId: string,
    @Param('id') taskId: string,
    @Body()
    taskData: Partial<{
      title: string;
      description: string;
      status: any;
      priority: number;
      dueDate: Date;
    }>,
  ) {
    return this.startupService.updateTask(tenantId, taskId, taskData);
  }

  @Delete('tasks/:id')
  async deleteTask(
    @CurrentTenant() tenantId: string,
    @Param('id') taskId: string,
  ) {
    return this.startupService.deleteTask(tenantId, taskId);
  }
}
