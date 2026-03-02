import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { CurrentTenant } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@database/prisma.service';

@Controller('ledger')
@UseGuards(JwtGuard, TenantGuard)
export class LedgerController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getLedger(@CurrentTenant() tenantId: string, @Query('status') status?: 'pending' | 'confirmed') {
    return this.prisma.memoryStore.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isConfirmed: status === 'confirmed' ? true : (status === 'pending' ? false : undefined),
      },
      include: {
        outgoingRelations: {
          include: { target: true }
        },
        incomingRelations: {
          include: { source: true }
        }
      },
      orderBy: [
        { isConfirmed: 'asc' },
        { salience: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  }

  @Patch(':id/confirm')
  async confirmMemory(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: { weight?: number; confidence?: number }
  ) {
    return this.prisma.memoryStore.update({
      where: { id, tenantId },
      data: {
        isConfirmed: true,
        strategyWeight: data.weight ?? 0.8,
        evidenceScore: data.confidence ?? undefined,
        lastUsed: new Date()
      }
    });
  }

  @Patch(':id/weight')
  async updateWeight(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: { weight: number }
  ) {
    return this.prisma.memoryStore.update({
      where: { id, tenantId },
      data: { strategyWeight: data.weight }
    });
  }

  @Delete(':id')
  async purgeMemory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.prisma.memoryStore.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() }
    });
  }
}
