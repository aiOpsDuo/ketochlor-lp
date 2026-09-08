import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX } from './presentation/auth/route-prefixes';

const DEFAULT_PORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  const port = process.env.PORT ?? DEFAULT_PORT;
  await app.listen(port);
}

bootstrap();
