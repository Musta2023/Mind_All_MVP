import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '@ai/ai.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ToolParsingService } from './services/tool-parsing.service';
import { ConversationRepository } from './repositories/conversation.repository';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [ChatService, ToolParsingService, ConversationRepository],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
