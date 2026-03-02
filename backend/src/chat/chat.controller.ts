import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtGuard } from '@common/guards/jwt.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import {
  CurrentUser,
  CurrentTenant,
  CurrentUserPayload,
} from '@common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
@UseGuards(JwtGuard, TenantGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('send')
  async sendMessage(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createMessageDto: CreateMessageDto,
    @Res() res: Response,
  ) {
    try {
      let headersSent = false;

      await this.chatService.sendMessage(
        tenantId,
        user.userId,
        createMessageDto,
        (token) => {
          if (!headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            headersSent = true;
          }
          res.write(`event: token\n`);
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        },
      );

      if (!headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      res.write(`event: complete\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      console.error('[Chat] Error:', error);
      
      if (!res.headersSent) {
        return res.status(error.status || 500).json({
          message: error.message || 'Failed to process message',
        });
      }

      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    }
  }

  @Get('conversations')
  async getConversations(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getConversations(tenantId, user.userId, limit, offset);
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.getConversation(tenantId, conversationId);
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.deleteConversation(tenantId, conversationId);
  }
}
