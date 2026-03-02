import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '@ai/ai.module';
import { RoadmapService } from './roadmap.service';
import { RoadmapController } from './roadmap.controller';
import { RoadmapRegenerator } from './roadmap-regenerator';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [RoadmapService, RoadmapRegenerator],
  controllers: [RoadmapController],
  exports: [RoadmapService],
})
export class RoadmapModule {}
