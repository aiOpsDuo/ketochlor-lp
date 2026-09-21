import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import type { SiteMetadataPersistido } from '../../domain';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { MySqlSiteMetadataRepository } from '../../infrastructure/mysql/site-metadata.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { criarOperadorAutenticadoDeTeste } from '../../infrastructure/test-support/operador-teste';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-metadata`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, contra o
 * `mysql` REAL do compose (tarefa `ajustes/migracao-mysql-cutover-wiring`,
 * que substitui o Supabase local/`SupabaseSiteMetadataRepository` deste
 * arquivo) — operador e login reais via `POST /api/auth/login`.
 *
 * Restaura o registro único de `site_metadata` ao estado lido no início da
 * suíte, em `afterAll` — mesma precaução de `content.e2e.test.ts` para não
 * vazar dado mutado entre execuções locais.
 */
describe('Metadata (e2e) — GET/PUT /api/admin/metadata + GET /api/content', () => {
  const email = `operador.metadata.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let repositorioDireto: MySqlSiteMetadataRepository;
  let operadorId: string;
  let accessToken: string;
  let estadoOriginal: SiteMetadataPersistido;

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);
    repositorioDireto = new MySqlSiteMetadataRepository(pool);

    estadoOriginal = await repositorioDireto.buscar();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const auth = await criarOperadorAutenticadoDeTeste(app, operadoresRepository, { email, senha });
    operadorId = auth.operadorId;
    accessToken = auth.accessToken;
  }, 20_000);

  afterAll(async () => {
    // Restaura o registro único ao estado lido antes de qualquer PUT deste
    // arquivo — via repositório direto (Infraestrutura), sem passar pela
    // validação do caso de uso (que rejeitaria title/description vazios).
    await repositorioDireto.atualizar({
      title: estadoOriginal.title,
      description: estadoOriginal.description,
      ogImageUrl: estadoOriginal.ogImageUrl,
      updatedBy: estadoOriginal.updatedBy,
    });

    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

  describe('autenticação das rotas administrativas', () => {
    it('rejeita GET /api/admin/metadata sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/metadata').expect(401);
    });

    it('rejeita PUT /api/admin/metadata sem token', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .send({ title: 'Título', description: 'Descrição', ogImageUrl: null })
        .expect(401);
    });
  });

  describe('PUT /api/admin/metadata — validação', () => {
    it('recusa title vazio com 422 e a lista de erros', async () => {
      const resposta = await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .set('Authorization', authHeader())
        .send({ title: '   ', description: 'Descrição válida de teste', ogImageUrl: null });

      expect(resposta.status).toBe(422);
      expect(Array.isArray(resposta.body.erros)).toBe(true);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'title'),
      ).toBe(true);
    });

    it('recusa description vazia com 422', async () => {
      const resposta = await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .set('Authorization', authHeader())
        .send({ title: 'Título válido de teste', description: '', ogImageUrl: null });

      expect(resposta.status).toBe(422);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'description'),
      ).toBe(true);
    });

    it('recusa ogImageUrl que não é uma URL http(s) válida com 422 (correção `ajustes/corrige-imagem-metadados`)', async () => {
      const resposta = await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .set('Authorization', authHeader())
        .send({
          title: 'Título válido de teste',
          description: 'Descrição válida de teste',
          ogImageUrl: 'não-é-uma-url',
        });

      expect(resposta.status).toBe(422);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'ogImageUrl'),
      ).toBe(true);
    });

    it('aceita ogImageUrl como uma URL http(s) válida', async () => {
      const resposta = await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .set('Authorization', authHeader())
        .send({
          title: 'Título válido de teste',
          description: 'Descrição válida de teste',
          ogImageUrl: 'https://exemplo.com/imagem-social.png',
        });

      expect(resposta.status).toBe(200);
      expect(resposta.body.ogImageUrl).toBe('https://exemplo.com/imagem-social.png');
    });
  });

  describe('PUT /api/admin/metadata → reflexo imediato em GET /api/admin/metadata e GET /api/content', () => {
    it('salva title/description/ogImageUrl, preenche updatedBy, e reflete nos dois GETs', async () => {
      const novoTitle = `Ketochlor® — título de teste e2e ${randomUUID()}`;
      const novaDescription = 'Descrição de teste e2e para os metadados do site.';

      const respostaPut = await request(app.getHttpServer())
        .put('/api/admin/metadata')
        .set('Authorization', authHeader())
        .send({ title: novoTitle, description: novaDescription, ogImageUrl: null });

      expect(respostaPut.status).toBe(200);
      expect(respostaPut.body.title).toBe(novoTitle);
      expect(respostaPut.body.description).toBe(novaDescription);
      expect(respostaPut.body.ogImageUrl).toBeNull();
      expect(respostaPut.body.updatedBy).toBe(operadorId);

      const respostaGetAdmin = await request(app.getHttpServer())
        .get('/api/admin/metadata')
        .set('Authorization', authHeader());
      expect(respostaGetAdmin.status).toBe(200);
      expect(respostaGetAdmin.body.title).toBe(novoTitle);
      expect(respostaGetAdmin.body.description).toBe(novaDescription);

      const respostaGetPublico = await request(app.getHttpServer()).get('/api/content');
      expect(respostaGetPublico.status).toBe(200);
      expect(respostaGetPublico.body.metadata.title).toBe(novoTitle);
      expect(respostaGetPublico.body.metadata.description).toBe(novaDescription);
    });
  });
});
