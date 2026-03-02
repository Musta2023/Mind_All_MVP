import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateStartupDto, UpdateStartupDto } from './dto/create-startup.dto';

@Injectable()
export class StartupService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createOrUpdate(
    tenantId: string,
    userId: string,
    createStartupDto: CreateStartupDto,
  ) {
    // Check if startup already exists for tenant
    let startup = await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!startup) {
      // Fetch tenant to get default name if not provided
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      // Create new
      startup = await this.prisma.startupProfile.create({
        data: {
          ...createStartupDto,
          name: createStartupDto.name || tenant?.name || 'My Startup',
          stage: createStartupDto.stage || 'idea',
          tenantId,
          userId,
        } as any,
      });
    }

    return startup;
  }

  async getProfile(tenantId: string) {
    const profile = await this.prisma.startupProfile.findUnique({
      where: { tenantId },
      include: {
        goals: {
          where: { deletedAt: null },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Startup profile not found');
    }

    return profile;
  }

  async updateProfile(tenantId: string, updateDto: UpdateStartupDto) {
    const profile = await this.prisma.startupProfile.update({
      where: { tenantId },
      data: updateDto,
      include: {
        goals: {
          where: { deletedAt: null },
          orderBy: { priority: 'desc' },
        },
      },
    });

    this.eventEmitter.emit('startup.updated', { tenantId });
    return profile;
  }

  async createGoal(
    tenantId: string,
    goalData: {
      title: string;
      deadline: Date | string;
      metrics: Record<string, any>;
      priority: any;
    },
  ) {
    const profile = await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      throw new NotFoundException('Startup profile not found');
    }

    const goal = await this.prisma.goal.create({
      data: {
        title: goalData.title,
        deadline: new Date(goalData.deadline),
        metrics: goalData.metrics || {},
        priority: this.mapPriority(goalData.priority),
        tenantId,
        profileId: profile.id,
      },
    });

    this.eventEmitter.emit('goal.updated', { tenantId });
    return goal;
  }

  async getGoals(tenantId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { priority: 'desc' },
    });

    return goals;
  }

  async updateGoal(
    tenantId: string,
    goalId: string,
    goalData: Partial<{
      title: string;
      deadline: Date | string;
      metrics: Record<string, any>;
      priority: any;
    }>,
  ) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, tenantId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const data: any = {};
    if (goalData.title !== undefined) data.title = goalData.title;
    if (goalData.deadline !== undefined) data.deadline = new Date(goalData.deadline);
    if (goalData.metrics !== undefined) data.metrics = goalData.metrics;
    if (goalData.priority !== undefined) data.priority = this.mapPriority(goalData.priority);

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data,
    });

    this.eventEmitter.emit('goal.updated', { tenantId });
    return updated;
  }

  async deleteGoal(tenantId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, tenantId },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return this.prisma.goal.update({
      where: { id: goalId },
      data: { deletedAt: new Date() },
    });
  }

  // ============ TASK MANAGEMENT (LEVEL 4) ============

  private mapPriority(p: any): number {
    if (typeof p === 'number') return Math.round(p);
    const s = String(p || '5').toLowerCase();
    if (s.includes('high')) return 10;
    if (s.includes('med')) return 5;
    if (s.includes('low')) return 2;
    const n = parseInt(s);
    return isNaN(n) ? 5 : n;
  }

  private mapStatus(s: any): any {
    const status = String(s || 'TODO').toUpperCase().replace(/\s+/g, '_');
    const valid = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    if (valid.includes(status)) return status;
    
    if (status.includes('PROGRESS')) return 'IN_PROGRESS';
    if (status.includes('DO') || status.includes('BACKLOG') || status.includes('PENDING')) return 'TODO';
    if (status.includes('FINISH') || status.includes('COMPLET') || status.includes('DONE')) return 'DONE';
    if (status.includes('WAIT') || status.includes('BLOCK')) return 'BLOCKED';
    
    return 'TODO';
  }

  async createTask(
    tenantId: string,
    userId: string,
    taskData: {
      title: string;
      description?: string;
      status?: any;
      priority?: any;
      dueDate?: Date | string;
      goalId?: string;
      roadmapId?: string;
    },
  ) {
    const task = await this.prisma.task.create({
      data: {
        title: taskData.title,
        description: taskData.description,
        status: this.mapStatus(taskData.status),
        priority: this.mapPriority(taskData.priority),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        goalId: taskData.goalId,
        roadmapId: taskData.roadmapId,
        tenantId,
        userId,
      },
    });

    this.eventEmitter.emit('task.created', { tenantId, taskId: task.id });
    return task;
  }

  async getTasks(tenantId: string, userId?: string) {
    const where: any = { tenantId, deletedAt: null };
    if (userId) where.userId = userId;

    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        goal: { select: { title: true } },
      },
    });
  }

  async updateTask(
    tenantId: string,
    taskId: string,
    taskData: Partial<{
      title: string;
      description: string;
      status: any;
      priority: any;
      dueDate: Date | string;
    }>,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const data: any = {};
    if (taskData.title !== undefined) data.title = taskData.title;
    if (taskData.description !== undefined) data.description = taskData.description;
    if (taskData.status !== undefined) data.status = this.mapStatus(taskData.status);
    if (taskData.priority !== undefined) data.priority = this.mapPriority(taskData.priority);
    if (taskData.dueDate !== undefined) data.dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
    });

    this.eventEmitter.emit('task.updated', { tenantId, taskId });
    return updated;
  }

  async deleteTask(tenantId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
  }

  // ============ DASHBOARD AGGREGATOR (OPTIMIZATION) ============

  async getDashboardSummary(tenantId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Parallel optimized fetch
    const [profile, briefing, tasks, ledger] = await Promise.all([
      this.prisma.startupProfile.findUnique({
        where: { tenantId },
        select: { name: true, stage: true, description: true, runway: true, fundingRaised: true }
      }),
      this.prisma.executiveBriefing.findUnique({
        where: { tenantId_date: { tenantId, date: today } }
      }),
      this.prisma.task.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ updatedAt: 'desc' }, { priority: 'desc' }],
        take: 20,
        include: { goal: { select: { title: true } } }
      }),
      this.prisma.memoryStore.findMany({
        where: { tenantId, deletedAt: null },
        take: 20,
        orderBy: [{ isConfirmed: 'asc' }, { salience: 'desc' }],
        select: { 
          id: true, insight: true, memoryType: true, isConfirmed: true, 
          strategyWeight: true, evidenceScore: true, createdAt: true,
          outgoingRelations: { 
            include: { target: { select: { insight: true } } } 
          }
        }
      })
    ]);

    return { profile, briefing, tasks, ledger };
  }
}
