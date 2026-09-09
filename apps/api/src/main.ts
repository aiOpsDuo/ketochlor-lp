// Carrega apps/api/.env (gitignored) antes de tudo, em desenvolvimento
// local (`npm run dev`/`nest start`) — mesmo mecanismo já usado por
// `apps/api/vitest.setup.ts` para os testes. Não afeta produção: não há
// `apps/api/.env` na imagem Docker (docker-compose.yml injeta as variáveis
// diretamente via `environment:`) e o `dotenv` não sobrescreve variáveis já
// definidas em `process.env` nem lança erro quando o arquivo não existe.
import 'dotenv/config';
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
