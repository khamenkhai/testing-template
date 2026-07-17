import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as path from 'path';

import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/utils/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // --- Logger ---
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // --- Static Assets ---
  app.useStaticAssets(path.join(process.cwd(), 'public'));

  // --- Environment & Constants ---
  const port = process.env.PORT ?? 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const globalPrefix = 'api';

  // --- Middleware & Security ---
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // --- Global NestJS Config ---
  app.setGlobalPrefix(globalPrefix, { exclude: ['/'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- Documentation (Development Only) ---
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('The official API documentation for the POS system.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Standard Swagger UI
    SwaggerModule.setup('swagger', app, document, {
      jsonDocumentUrl: 'swagger/json',
    });

    // Modern Scalar UI
    app.use(
      '/reference',
      apiReference({
        content: document,
      }),
    );
  }
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  // --- Server Startup ---
  await app.listen(port);

  console.log(`
🚀 Application is running on : http://localhost:${port}/${globalPrefix}
🏥 Health Check               : http://localhost:${port}/health/test-2
📖 Swagger Documentation     : http://localhost:${port}/swagger
📖 Scalar Documentation      : http://localhost:${port}/reference
  `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
