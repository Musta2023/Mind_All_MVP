import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '@common/guards/jwt.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { CurrentTenant } from '@common/decorators/current-user.decorator';
import { MemoryService } from '@ai/memory.service';
import { PrismaService } from '@database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';

@Controller('vault')
@UseGuards(JwtGuard, TenantGuard)
export class VaultController {
  constructor(
    private memoryService: MemoryService,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    console.log('[Vault] VaultController initialized');
  }

  @Sse('progress')
  streamProgress(@CurrentTenant() tenantId: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'vault.progress').pipe(
      filter((data: any) => data.tenantId === tenantId),
      map((data: any) => ({
        data: {
          filename: data.filename,
          status: data.status,
          progress: data.progress,
          message: data.message,
        },
      } as MessageEvent)),
    );
  }

  @Get('health')
  health() {
    return { status: 'ok', module: 'vault' };
  }

  @Get('documents')
  async getDocuments(@CurrentTenant() tenantId: string) {
    // Return unique document names from MemoryStore
    // In Postgres, distinct requires orderBy to match the distinct fields
    const documents = await this.prisma.memoryStore.findMany({
      where: { 
        tenantId, 
        sourceType: 'DOCUMENT', 
        deletedAt: null 
      },
      select: { 
        context: true, 
        createdAt: true 
      },
      distinct: ['context'],
      orderBy: { 
        context: 'asc' 
      },
    });

    return documents.map(doc => {
      // Robustly remove the "Source: " prefix
      const name = doc.context.startsWith('Source: ') 
        ? doc.context.substring(8) 
        : doc.context;
        
      return {
        name,
        ingestedAt: doc.createdAt,
      };
    });
  }

  @Delete('documents/:name')
  async deleteDocument(
    @CurrentTenant() tenantId: string,
    @Param('name') name: string,
  ) {
    const context = `Source: ${name}`;
    
    // Soft delete all chunks associated with this document
    const result = await this.prisma.memoryStore.updateMany({
      where: {
        tenantId,
        context,
        sourceType: 'DOCUMENT',
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: `Successfully deleted document and ${result.count} associated semantic chunks.`,
      filename: name,
      chunksDeleted: result.count,
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['application/pdf', 'text/markdown', 'text/plain'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF and Markdown are supported.');
    }

    // Ingest asynchronously
    this.memoryService.ingestDocument(tenantId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    }).catch(err => console.error('[Vault] Ingestion failed:', err));

    return {
      message: 'File uploaded and is being processed in the Knowledge Vault.',
      filename: file.originalname,
    };
  }
}
