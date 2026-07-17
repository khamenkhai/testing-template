import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const method = request.method;
    const path = request.url;
    const responseMessage =
      this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler()) ||
      this.getDefaultMessageForMethod(method);

    return next.handle().pipe(
      map((res) => {
        if (res && typeof res === 'object' && 'data' in res) {
          return {
            success: true,
            message: responseMessage,
            data: res.data,
            ...('meta' in res ? { meta: res.meta } : {}),
            timestamp: new Date().toISOString(),
            path,
          };
        }

        return {
          success: true,
          message: responseMessage,
          data: res,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }

  private getDefaultMessageForMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'Record created successfully';
      case 'GET':
        return 'Data retrieved successfully';
      case 'PUT':
      case 'PATCH':
        return 'Record updated successfully';
      case 'DELETE':
        return 'Record deleted successfully';
      default:
        return 'Request successful';
    }
  }
}
