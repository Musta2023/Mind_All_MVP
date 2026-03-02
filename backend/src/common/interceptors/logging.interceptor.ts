import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SecurityLogger } from '../utils/security-logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - now;
        const logMessage = `[${method}] ${url} - ${response.statusCode} - ${duration}ms${user ? ` (user: ${user.userId})` : ''}`;
        
        // Use SecurityLogger to ensure even metadata logs are PII-safe
        SecurityLogger.log(logMessage);
      }),
    );
  }
}
