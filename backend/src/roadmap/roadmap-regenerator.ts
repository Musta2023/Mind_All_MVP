import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RoadmapService } from './roadmap.service';

@Injectable()
export class RoadmapRegenerator {
  private readonly logger = new Logger(RoadmapRegenerator.length.toString());
  private lastRegen: Map<string, number> = new Map();

  constructor(private roadmapService: RoadmapService) {}

  @OnEvent('startup.updated', { async: true })
  @OnEvent('goal.updated', { async: true })
  async handleStartupChange(payload: { tenantId: string }) {
    const { tenantId } = payload;
    const now = Date.now();
    const last = this.lastRegen.get(tenantId) || 0;

    // Debounce: Only regenerate once every 5 minutes per tenant to save tokens
    if (now - last < 5 * 60 * 1000) {
      this.logger.log(`[Roadmap] Skipping regeneration for tenant ${tenantId} (debounced)`);
      return;
    }

    this.logger.log(`[Roadmap] Triggering reactive regeneration for tenant: ${tenantId}`);
    
    try {
      this.lastRegen.set(tenantId, now);
      
      // We don't stream here as it's a background task, but we store the result
      await this.roadmapService.generateRoadmap(tenantId, (token) => {
        // No-op for tokens in background
      });
      
      this.logger.log(`[Roadmap] Successfully regenerated roadmap for tenant: ${tenantId}`);
    } catch (error) {
      this.logger.error(`[Roadmap] Failed to regenerate roadmap for tenant ${tenantId}:`, error);
    }
  }
}
