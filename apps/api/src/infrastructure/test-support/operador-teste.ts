import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MySqlOperadoresRepository } from '../mysql/operadores.repository';

export interface OperadorAutenticadoDeTeste {
  operadorId: string;
  accessToken: string;
}

/**
 * Cria um operador real (MySQL, via `MySqlOperadoresRepository.criar` —
 * nunca mock) e autentica contra `POST /api/auth/login` numa aplicação Nest
 * já inicializada (`app.init()` já chamado) — helper comum aos e2e de
 * `content`/`leads`/`media`/`metadata`/`operators`/`auth`, que precisam de um
 * `Authorization: Bearer` real emitido pelo módulo de login próprio (G5/DRY
 * de `references/clean-code.md` — a mesma sequência "criar operador → logar
 * → guardar accessToken" não deveria ser reimplementada em cada arquivo de
 * teste).
 */
export async function criarOperadorAutenticadoDeTeste(
  app: INestApplication,
  operadoresRepository: MySqlOperadoresRepository,
  opcoes: { email: string; senha: string; nome?: string },
): Promise<OperadorAutenticadoDeTeste> {
  const operador = await operadoresRepository.criar({
    email: opcoes.email,
    senha: opcoes.senha,
    nome: opcoes.nome ?? 'Operador de Teste',
  });

  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: opcoes.email, senha: opcoes.senha });

  if (login.status !== 200 || typeof login.body.accessToken !== 'string') {
    throw new Error(
      `Falha ao autenticar operador de teste "${opcoes.email}": status ${login.status}.`,
    );
  }

  return { operadorId: operador.id, accessToken: login.body.accessToken };
}
