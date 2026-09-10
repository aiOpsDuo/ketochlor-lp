// Carrega apps/api/.env (gitignored) antes de tudo, em desenvolvimento
// local (`npm run dev`/`nest start`) — mesmo mecanismo já usado por
// `apps/api/vitest.setup.ts` para os testes. Não afeta produção: não há
// `apps/api/.env` na imagem Docker nem no serviço do Render (docker-compose.yml
// e render.yaml injetam as variáveis diretamente) e o `dotenv` não sobrescreve
// variáveis já definidas em `process.env` nem lança erro quando o arquivo não
// existe.
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX } from './presentation/auth/route-prefixes';
import { serveStaticSites } from './presentation/static-sites';

const DEFAULT_PORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  // Origem única: se os `dist` da LP e do painel estiverem ao lado, este mesmo
  // processo os serve em `/` e `/admin` — é o caso do Render, onde um serviço é
  // um contêiner com uma porta só. Com o docker-compose (quem serve é o nginx)
  // ou em `npm run dev` (quem serve é o Vite) os `dist` não estão lá, nada é
  // montado e a API sobe idêntica. Ver `presentation/static-sites.ts`.
  const servidos = serveStaticSites(app);

  const port = process.env.PORT ?? DEFAULT_PORT;
  // `0.0.0.0` e não o default do Node: em contêiner de serviço gerenciado o
  // roteador externo alcança o processo por outra interface, e escutar só em
  // localhost aparece no Render como "no open ports detected" — o deploy fica
  // preso sem nunca ficar saudável.
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  const base = `http://localhost:${port}`;
  logger.log(`API disponível em ${base}/${API_GLOBAL_PREFIX}`);
  if (servidos.lp) {
    logger.log(`LP disponível em ${base}/`);
  }
  if (servidos.admin) {
    logger.log(`Painel disponível em ${base}/admin/`);
  }
}

bootstrap();
