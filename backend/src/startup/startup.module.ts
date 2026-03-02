import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { StartupService } from './startup.service';
import { StartupController } from './startup.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => AiModule)],
  providers: [StartupService],
  controllers: [StartupController],
  exports: [StartupService],
})
export class StartupModule {}
