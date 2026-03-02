import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { PrismaService } from '@database/prisma.service';

@Processor('briefing-queue')
export class BriefingWorker extends WorkerHost {
  private readonly logger = new Logger(BriefingWorker.name);

  constructor(
    private briefingService: BriefingService,
    private prisma: PrismaService,
  ) {
    super();
  }

  /**
   * Main entry point for background jobs.
   * Logic: "Wake up and generate reports for all active startups."
   */
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[Worker] Processing job: ${job.name}`);

    if (job.name === 'generate-all-briefings') {
      // Find all active tenants
      const tenants = await this.prisma.tenant.findMany({
        where: { deletedAt: null },
        select: { id: true }
      });

      this.logger.log(`[Worker] Generating briefings for ${tenants.length} tenants`);

      for (const tenant of tenants) {
        try {
          await this.briefingService.generateDailyBriefing(tenant.id);
        } catch (err) {
          this.logger.error(`[Worker] Failed for tenant ${tenant.id}:`, err);
        }
      }
    }

    return { status: 'completed' };
  }
}
