import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiOrchestrationService } from './ai-orchestration.service';
import { MemoryService } from './memory.service';
import { TokenCounterService } from './token-counter.service';
import { MemoryCompactionService } from './memory-compaction.service';
import { ToolExecutorService } from './tool-executor.service';
import { BriefingService } from './briefing.service';
import { BriefingWorker } from './briefing.worker';
import { IntelligenceRouterService } from './intelligence-router.service';
import { VaultController } from './vault.controller';
import { LedgerController } from './ledger.controller';
import { StartupModule } from '../startup/startup.module';

@Module({
  imports: [
    DatabaseModule, 
    forwardRef(() => StartupModule),
    BullModule.registerQueue({
      name: 'briefing-queue',
    }),
  ],
  controllers: [VaultController, LedgerController],
  providers: [
    AiOrchestrationService,
    MemoryService,
    TokenCounterService,
    MemoryCompactionService,
    ToolExecutorService,
    BriefingService,
    BriefingWorker,
    IntelligenceRouterService,
  ],
  exports: [
    AiOrchestrationService,
    MemoryService,
    TokenCounterService,
    MemoryCompactionService,
    ToolExecutorService,
    BriefingService,
    IntelligenceRouterService,
  ],
})
export class AiModule {}
