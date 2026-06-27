import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error(`Uncaught Exception: ${err.message}`, err.stack, `origin: ${origin}`);
});
export let appInstance: INestApplication;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  appInstance = app;
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();