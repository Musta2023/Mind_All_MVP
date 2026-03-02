import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis-store/redis.module';
import { AuthModule } from './auth/auth.module';
import { StartupModule } from './startup/startup.module';
import { ChatModule } from './chat/chat.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { VaultController } from './ai/vault.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 20, // 20 requests per minute per IP/Client by default
    }]),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    StartupModule,
    ChatModule,
    RoadmapModule,
    AiModule,
  ],
  controllers: [AppController, VaultController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
