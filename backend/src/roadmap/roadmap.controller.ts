import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtGuard } from '@common/guards/jwt.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { CurrentTenant } from '@common/decorators/current-user.decorator';
import { RoadmapService } from './roadmap.service';

@Controller('roadmap')
@UseGuards(JwtGuard, TenantGuard)
export class RoadmapController {
  constructor(private roadmapService: RoadmapService) {}

  @Post('generate')
  async generateRoadmap(
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const result = await this.roadmapService.generateRoadmap(tenantId, (token) => {
        res.write(`event: token\n`);
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      });

      res.write(`event: complete\n`);
      res.write(
        `data: ${JSON.stringify({
          roadmap: result.roadmap,
          savedId: result.savedId,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        })}\n\n`,
      );
      res.end();
    } catch (error) {
      console.error('[Roadmap] Error:', error);
      res.write(`event: error\n`);
      res.write(
        `data: ${JSON.stringify({
          message: error.message || 'Failed to generate roadmap',
        })}\n\n`,
      );
      res.end();
    }
  }

  @Get()
  async getRoadmaps(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    return this.roadmapService.getRoadmaps(tenantId, limit, offset);
  }

  @Get(':id')
  async getRoadmap(
    @CurrentTenant() tenantId: string,
    @Param('id') roadmapId: string,
  ) {
    return this.roadmapService.getRoadmap(tenantId, roadmapId);
  }

  @Delete(':id')
  async deleteRoadmap(
    @CurrentTenant() tenantId: string,
    @Param('id') roadmapId: string,
  ) {
    console.log(`[Roadmap] Deleting roadmap: ${roadmapId} for tenant: ${tenantId}`);
    return this.roadmapService.deleteRoadmap(tenantId, roadmapId);
  }
}
