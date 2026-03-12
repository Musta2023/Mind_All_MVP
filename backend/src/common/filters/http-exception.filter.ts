import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = 
      exception instanceof HttpException 
        ? exception.getResponse() 
        : { message: exception.message || 'Internal Server Error' };

    const errorResponse = {
      statusCode: status,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'Internal Server Error',
      timestamp: new Date().toISOString(),
    };

    console.error('[GLOBAL EXCEPTION]', {
      status,
      message: errorResponse.message,
      stack: exception.stack,
      exception
    });

    response.status(status).json(errorResponse);
  }
}
