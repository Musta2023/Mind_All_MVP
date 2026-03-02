import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '@ai/ai.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
