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

import { SearchWebTool } from './tools/implementations/search-web.tool';
import { CreateGoalTool } from './tools/implementations/create-goal.tool';
import { UpdateGoalTool } from './tools/implementations/update-goal.tool';
import { UpdateStartupProfileTool } from './tools/implementations/update-startup-profile.tool';
import { CreateTaskTool } from './tools/implementations/create-task.tool';
import { UpdateTaskTool } from './tools/implementations/update-task.tool';
import { ListTasksTool } from './tools/implementations/list-tasks.tool';

import { AiResilienceService } from './services/ai-resilience.service';
import { AiClientService } from './services/ai-client.service';

import { ContextBuilderService } from './services/context-builder.service';
import { EmbeddingService } from './services/embedding.service';

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
    AiResilienceService,
    AiClientService,
    ContextBuilderService,
    EmbeddingService,
    AiOrchestrationService,
    MemoryService,
    TokenCounterService,
    MemoryCompactionService,
    ToolExecutorService,
    SearchWebTool,
    CreateGoalTool,
    UpdateGoalTool,
    UpdateStartupProfileTool,
    CreateTaskTool,
    UpdateTaskTool,
    ListTasksTool,
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
