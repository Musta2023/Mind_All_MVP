import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const { createClient } = require('redis');

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl) {
      console.warn('[Redis] REDIS_URL not set, Redis features disabled');
      return;
    }

    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.warn('[Redis] Max reconnection attempts reached. Redis features will be disabled.');
              return false; // stop retrying
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        // Suppress initial connection flood
      });

      await this.client.connect();
      console.log('[Redis] Connected');
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  getClient(): any | null {
    return this.client || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) return;

    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    return this.client.expire(key, seconds);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.exists(key)) > 0;
  }
}
