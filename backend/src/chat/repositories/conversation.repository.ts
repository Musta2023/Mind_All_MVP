import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class ConversationRepository {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(tenantId: string, userId: string, initialMessage: string, providedConversationId?: string) {
    if (providedConversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: providedConversationId, tenantId },
      });
      if (conversation) {
        return conversation;
      }
    }

    const profile = await this.prisma.startupProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      throw new BadRequestException('Startup profile not found');
    }

    const title = initialMessage.substring(0, 40) + (initialMessage.length > 40 ? '...' : '');

    return this.prisma.conversation.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        title: title || 'New Strategic Chat',
      },
    });
  }

  async saveMessage(data: { conversationId: string, tenantId: string, role: string, content: string, tokensUsed?: number, costEstimate?: number }) {
    return this.prisma.message.create({ data });
  }

  async touchConversation(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async logToolExecution(tenantId: string, userId: string, toolName: string, parameters: any, status: string) {
    return this.prisma.toolExecutionLog.create({
      data: { tenantId, userId, toolName, parameters, status }
    }).catch(() => {});
  }

  async getConversations(tenantId: string, userId: string, limit: number, offset: number) {
    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { tenantId, userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.conversation.count({
        where: { tenantId, userId, deletedAt: null },
      }),
    ]);
    return { conversations, total };
  }

  async getConversationFull(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, deletedAt: null },
      include: {
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
