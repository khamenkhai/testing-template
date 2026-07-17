import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  RouterModule,
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
} from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { join } from 'path';

// Database & Common
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { HttpLoggerMiddleware } from './common/logger/http-logger.middleware';
import { ApiResponseInterceptor } from './common/interceptor/api-response.interceptor';
import { HealthController } from './common/health/health.controller';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TodoModule } from './modules/todo/todo.module';
import { UploadModule } from './modules/upload/upload.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    /// TO LOAD ENVIRONMENT VARIABLES
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    LoggerModule,

    /// TO SERVE STATIC FILES
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'uploads'),
      serveRoot: '/files',
      exclude: ['/api/(.*)'],
    }),

    /// TO LIMIT THE NUMBER OF REQUESTS PER USER
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: 3 },
        { name: 'medium', ttl: 60000, limit: 60 },
        { name: 'long', ttl: 86400000, limit: 2000 },
      ],
    }),

    /// TO CONNECT TO DATABASE
    PrismaModule,

    /// FEATURE MODULES
    AuthModule,
    UsersModule,
    TodoModule,
    UploadModule,
    RolesModule,

    /// ROUTER MODULE IMPLEMENTATION
    RouterModule.register([
      {
        path: 'v1',
        children: [
          { path: 'auth', module: AuthModule },
          { path: 'todo', module: TodoModule },
          { path: 'upload', module: UploadModule },
          {
            path: 'admin',
            children: [
              { path: 'users', module: UsersModule },
              { path: 'roles', module: RolesModule },
            ],
          },
        ],
      },
    ]),
  ],
  providers: [
    {
      /// TO APPLY THROTTLER GUARD TO ALL ROUTES
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      /// GLOBAL API RESPONSE FORMATTER
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      /// GLOBAL ERROR FILTERING (SENTRY)
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    /// APPLY HTTP LOGGING MIDDLEWARE
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
