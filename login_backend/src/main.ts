import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error(
    `Uncaught Exception: ${err.message}`,
    err.stack,
    `origin: ${origin}`,
  );
});
export let appInstance: INestApplication;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // shall change to actual domain later
  // const allowedOrigins = [
  //   'https://ghc-login.web.app',
  //   'https://project-3857994f-2565-4c14-9a7.web.app',
  // ];
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip unknown properties
      forbidNonWhitelisted: true, // reject requests with extra properties
      transform: true,            // auto-transform payloads to DTO instances
    }),
  );
  appInstance = app;
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
