import { randomUUID } from 'node:crypto';
import { POLITICA_PRIVACIDADE_URL } from '@ketochlor/content-schema';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { LeadsRepository } from '../../domain';
import { MySqlLeadsRepository } from '../../infrastructure/mysql/leads.repository';
import { paraMysqlDatetime } from '../../infrastructure/mysql/mysql-datas';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { criarOperadorAutenticadoDeTeste } from '../../infrastructure/test-support/operador-teste';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-leads`: sobe a aplicação Nest completa
 * (`AppModule`) via `@nestjs/testing` + `supertest`, contra o `mysql` REAL do
 * compose — operador e login reais via `POST /api/auth/login` para as rotas
 * administrativas; `POST /api/leads` é exercitado sem nenhum header de
 * autenticação, para provar (não presumir) que a rota é pública.
 *
 * Todo lead criado por este arquivo é apagado em `afterAll` via o
 * repositório direto (Infraestrutura) — mesma precaução de
 * `infrastructure/mysql/leads.repository.test.ts` para não deixar dado de
 * teste na tabela `leads` entre execuções locais da suíte.
 */
describe('Leads (e2e) — POST /api/leads + GET/DELETE /api/admin/leads*', () => {
  const email = `operador.leads.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let repositorioDireto: LeadsRepository;
  let operadorId: string;
  let accessToken: string;
  const idsParaLimpar: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

  const TEXTO_CONSENTIMENTO = 'Li e aceito a política de privacidade (LGPD)';

  function corpoLeadValido(overrides: Record<string, unknown> = {}) {
    return {
      nome: 'Dra. Maria Teste',
      email: `maria.teste.e2e.${randomUUID()}@example.com`,
      telefone: '11999999999',
      crmv: 'CRMV-SP 12345',
      estadoCidade: 'São Paulo/SP',
      especialidade: 'Dermatologia',
      jaClienteVirbac: true,
      desejaContatoComercial: false,
      origem: 'teste-e2e-leads',
      consentimentoAceito: true,
      consentimentoTexto: TEXTO_CONSENTIMENTO,
      ...overrides,
    };
  }

  async function criarLeadDireto(overrides: Record<string, unknown> = {}) {
    const resposta = await request(app.getHttpServer())
      .post('/api/leads')
      .send(corpoLeadValido(overrides));
    idsParaLimpar.push(resposta.body.id);
    return resposta.body as { id: string; createdAt: string };
  }

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);
    repositorioDireto = new MySqlLeadsRepository(pool);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const auth = await criarOperadorAutenticadoDeTeste(app, operadoresRepository, { email, senha });
    operadorId = auth.operadorId;
    accessToken = auth.accessToken;
  }, 20_000);

  afterAll(async () => {
    for (const id of idsParaLimpar) {
      if (id) {
        await repositorioDireto.excluir(id);
      }
    }
    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

  describe('POST /api/leads (pública)', () => {
    it('cria um lead com 201 SEM nenhum header de autenticação, com o registro do consentimento na resposta e no banco', async () => {
      const antesDoEnvio = Date.now();
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send(corpoLeadValido());

      expect(resposta.status).toBe(201);
      expect(resposta.body.id).toBeTruthy();
      expect(resposta.body.nome).toBe('Dra. Maria Teste');
      expect(resposta.body.consentimentoAceito).toBe(true);
      idsParaLimpar.push(resposta.body.id);

      // Confirma no registro persistido (via listagem administrativa), não só
      // na resposta do POST: aceite + instante de servidor (= created_at) +
      // texto exibido + URL da política (pedido do cliente de 2026-10-02).
      const listagem = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      const persistido = listagem.body.find((l: { id: string }) => l.id === resposta.body.id);
      expect(persistido).toMatchObject({
        consentimentoAceito: true,
        consentimentoTexto: TEXTO_CONSENTIMENTO,
        consentimentoPoliticaUrl: POLITICA_PRIVACIDADE_URL,
      });
      expect(persistido.consentimentoEm).toBe(persistido.createdAt);
      // DATETIME tem resolução de segundo — tolerância de 1s para trás.
      expect(Date.parse(persistido.consentimentoEm)).toBeGreaterThanOrEqual(antesDoEnvio - 1000);
    });

    it('ignora instante e URL da política enviados pelo cliente — os dois são sempre do servidor', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send(
          corpoLeadValido({
            consentimentoEm: '2000-01-01T00:00:00.000Z',
            consentimentoPoliticaUrl: 'https://malicioso.example.com/politica',
          }),
        );

      expect(resposta.status).toBe(201);
      idsParaLimpar.push(resposta.body.id);
      expect(resposta.body.consentimentoPoliticaUrl).toBe(POLITICA_PRIVACIDADE_URL);
      expect(resposta.body.consentimentoEm).toBe(resposta.body.createdAt);
      expect(resposta.body.consentimentoEm.startsWith('2000-')).toBe(false);
    });

    it('aceita um corpo sem consentimentoTexto e grava o texto como null', async () => {
      const { consentimentoTexto: _texto, ...semTexto } = corpoLeadValido();
      const resposta = await request(app.getHttpServer()).post('/api/leads').send(semTexto);

      expect(resposta.status).toBe(201);
      idsParaLimpar.push(resposta.body.id);
      expect(resposta.body.consentimentoAceito).toBe(true);
      expect(resposta.body.consentimentoTexto).toBeNull();
      expect(resposta.body.consentimentoPoliticaUrl).toBe(POLITICA_PRIVACIDADE_URL);
    });

    it.each([
      ['não é string', 123],
      ['passa de 500 caracteres', 'a'.repeat(501)],
    ])('recusa 422 um consentimentoTexto que %s e não cria nenhum registro', async (_caso, valor) => {
      const emailUnico = `texto.invalido.e2e.${randomUUID()}@example.com`;
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send(corpoLeadValido({ email: emailUnico, consentimentoTexto: valor }));

      expect(resposta.status).toBe(422);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'consentimentoTexto'),
      ).toBe(true);

      const listagem = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      expect(listagem.body.some((l: { email: string }) => l.email === emailUnico)).toBe(false);
    });

    it('recusa 422 um corpo sem consentimentoAceito e não cria nenhum registro', async () => {
      const emailUnico = `sem.consentimento.e2e.${randomUUID()}@example.com`;
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send(corpoLeadValido({ email: emailUnico, consentimentoAceito: false }));

      expect(resposta.status).toBe(422);
      expect(Array.isArray(resposta.body.erros)).toBe(true);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'consentimentoAceito'),
      ).toBe(true);

      const listagem = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      expect(listagem.body.some((l: { email: string }) => l.email === emailUnico)).toBe(false);
    });

    it('recusa 422 um corpo sem nome/email', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send({ nome: '', email: '', consentimentoAceito: true });

      expect(resposta.status).toBe(422);
      expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'nome')).toBe(
        true,
      );
      expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'email')).toBe(
        true,
      );
    });
  });

  describe('autenticação das rotas administrativas', () => {
    it('rejeita GET /api/admin/leads sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/leads').expect(401);
    });

    it('rejeita GET /api/admin/leads/export.csv sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/leads/export.csv').expect(401);
    });

    it('rejeita DELETE /api/admin/leads/:id sem token', async () => {
      await request(app.getHttpServer()).delete(`/api/admin/leads/${randomUUID()}`).expect(401);
    });
  });

  describe('GET /api/admin/leads — ordenação e filtro de período', () => {
    it('lista mais recente primeiro, e o filtro from/to reduz a listagem ao intervalo', async () => {
      const antigo = await criarLeadDireto({ nome: 'Lead Antigo E2E', origem: 'periodo-antigo' });
      const recente = await criarLeadDireto({ nome: 'Lead Recente E2E', origem: 'periodo-recente' });

      // Mesma técnica de `infrastructure/mysql/leads.repository.test.ts`:
      // fixa `created_at` via query direta no pool, para o filtro de período
      // não depender de timing de execução do teste.
      const umDiaAtras = paraMysqlDatetime(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      const agora = paraMysqlDatetime(new Date().toISOString());
      await pool.execute('UPDATE leads SET created_at = ? WHERE id = ?', [umDiaAtras, antigo.id]);
      await pool.execute('UPDATE leads SET created_at = ? WHERE id = ?', [agora, recente.id]);

      const listagemCompleta = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      expect(listagemCompleta.status).toBe(200);
      const indiceAntigo = listagemCompleta.body.findIndex(
        (l: { id: string }) => l.id === antigo.id,
      );
      const indiceRecente = listagemCompleta.body.findIndex(
        (l: { id: string }) => l.id === recente.id,
      );
      expect(indiceRecente).toBeLessThan(indiceAntigo);

      const somenteRecentes = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .query({ from: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
        .set('Authorization', authHeader());
      expect(somenteRecentes.body.some((l: { id: string }) => l.id === recente.id)).toBe(true);
      expect(somenteRecentes.body.some((l: { id: string }) => l.id === antigo.id)).toBe(false);
    });

    it('recusa 400 um "from" que não é uma data ISO válida', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .query({ from: 'não-é-uma-data' })
        .set('Authorization', authHeader());
      expect(resposta.status).toBe(400);
    });
  });

  describe('GET /api/admin/leads/export.csv', () => {
    it('devolve Content-Type text/csv com cabeçalho e uma linha por lead', async () => {
      const lead = await criarLeadDireto({ nome: 'Lead Export CSV E2E' });

      const resposta = await request(app.getHttpServer())
        .get('/api/admin/leads/export.csv')
        .set('Authorization', authHeader());

      expect(resposta.status).toBe(200);
      expect(resposta.headers['content-type']).toContain('text/csv');

      const linhas = (resposta.text as string).trim().split('\r\n');
      expect(linhas[0]).toBe(
        'id,nome,email,telefone,crmv,estadoCidade,especialidade,jaClienteVirbac,desejaContatoComercial,origem,createdAt,consentimentoAceito,consentimentoEm,consentimentoTexto,consentimentoPoliticaUrl',
      );

      const listagemJson = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      // Cabeçalho + uma linha por lead da mesma listagem (sem filtro).
      expect(linhas.length).toBe(listagemJson.body.length + 1);
      const linhaDoLead = linhas.find((linha: string) => linha.startsWith(lead.id));
      expect(linhaDoLead).toBeTruthy();
      expect(
        linhaDoLead?.endsWith(
          `,true,${lead.createdAt},${TEXTO_CONSENTIMENTO},${POLITICA_PRIVACIDADE_URL}`,
        ),
      ).toBe(true);
    });
  });

  describe('DELETE /api/admin/leads/:id', () => {
    it('remove o lead de fato (confirmado por uma listagem depois) e devolve 204', async () => {
      const lead = await criarLeadDireto({ nome: 'Lead Para Excluir E2E' });

      const respostaDelete = await request(app.getHttpServer())
        .delete(`/api/admin/leads/${lead.id}`)
        .set('Authorization', authHeader());
      expect(respostaDelete.status).toBe(204);

      const listagem = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      expect(listagem.body.some((l: { id: string }) => l.id === lead.id)).toBe(false);
    });

    it('devolve 404 para um id inexistente', async () => {
      const resposta = await request(app.getHttpServer())
        .delete(`/api/admin/leads/${randomUUID()}`)
        .set('Authorization', authHeader());
      expect(resposta.status).toBe(404);
    });
  });
});
