import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarSupabaseAdminClient } from '../../infrastructure/supabase/supabase-client.factory';
import { SupabaseLeadsRepository } from '../../infrastructure/supabase/leads.repository';
import {
  ANON_KEY_LOCAL,
  carregarSupabaseTestEnv,
} from '../../infrastructure/test-support/supabase-test-env';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-leads`: sobe a aplicação Nest completa
 * (`AppModule`) via `@nestjs/testing` + `supertest`, mesmo padrão de
 * `presentation/metadata/metadata.e2e.test.ts`, contra o Supabase LOCAL de
 * verdade (`npx supabase start`) — usuário e login reais para as rotas
 * administrativas; `POST /api/leads` é exercitado sem nenhum header de
 * autenticação, para provar (não presumir) que a rota é pública.
 *
 * Todo lead criado por este arquivo é apagado em `afterAll` via o
 * repositório direto (Infraestrutura) — mesma precaução de
 * `infrastructure/supabase/leads.repository.test.ts` para não deixar dado de
 * teste na tabela `leads` entre execuções locais da suíte.
 */
describe('Leads (e2e) — POST /api/leads + GET/DELETE /api/admin/leads*', () => {
  const email = `operador.leads.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let adminClient: SupabaseClient;
  let repositorioDireto: SupabaseLeadsRepository;
  let userId: string;
  let accessToken: string;
  const idsParaLimpar: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

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
    const env = carregarSupabaseTestEnv();
    adminClient = criarSupabaseAdminClient(env);
    repositorioDireto = new SupabaseLeadsRepository(adminClient);
    const anonClient = createClient(env.url, ANON_KEY_LOCAL);

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
    }
    userId = data.user.id;

    const login = await anonClient.auth.signInWithPassword({ email, password: senha });
    if (login.error || !login.data.session) {
      throw new Error(`Falha ao autenticar usuário de teste: ${login.error?.message}`);
    }
    accessToken = login.data.session.access_token;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    for (const id of idsParaLimpar) {
      if (id) {
        await repositorioDireto.excluir(id);
      }
    }
    await app.close();
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

  describe('POST /api/leads (pública)', () => {
    it('cria um lead com 201 SEM nenhum header de autenticação, e a resposta nunca tem consentimentoAceito', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/leads')
        .send(corpoLeadValido());

      expect(resposta.status).toBe(201);
      expect(resposta.body.id).toBeTruthy();
      expect(resposta.body.nome).toBe('Dra. Maria Teste');
      expect(resposta.body.consentimentoAceito).toBeUndefined();
      idsParaLimpar.push(resposta.body.id);

      // Confirma que o registro persistido também não carrega o campo — não
      // é só a resposta HTTP que o omite, ele nunca existiu no banco (PRD §
      // Compliance/LGPD).
      const listagem = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      const persistido = listagem.body.find((l: { id: string }) => l.id === resposta.body.id);
      expect(persistido).toBeTruthy();
      expect(persistido.consentimentoAceito).toBeUndefined();
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

      // Mesma técnica de `infrastructure/supabase/leads.repository.test.ts`:
      // fixa `created_at` via cliente Supabase direto, para o filtro de
      // período não depender de timing de execução do teste.
      const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const agora = new Date().toISOString();
      await adminClient.from('leads').update({ created_at: umDiaAtras }).eq('id', antigo.id);
      await adminClient.from('leads').update({ created_at: agora }).eq('id', recente.id);

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
        'id,nome,email,telefone,crmv,estadoCidade,especialidade,jaClienteVirbac,desejaContatoComercial,origem,createdAt',
      );

      const listagemJson = await request(app.getHttpServer())
        .get('/api/admin/leads')
        .set('Authorization', authHeader());
      // Cabeçalho + uma linha por lead da mesma listagem (sem filtro).
      expect(linhas.length).toBe(listagemJson.body.length + 1);
      expect(linhas.some((linha: string) => linha.startsWith(lead.id))).toBe(true);
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
