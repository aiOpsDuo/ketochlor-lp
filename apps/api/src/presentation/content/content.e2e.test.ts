import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlContentSectionsRepository } from '../../infrastructure/mysql/content-sections.repository';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { criarOperadorAutenticadoDeTeste } from '../../infrastructure/test-support/operador-teste';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-content`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, contra o
 * `mysql` REAL do compose — operador e login reais via
 * `POST /api/auth/login`, nunca um token fabricado à mão para o caminho
 * feliz.
 *
 * Usa as seções `problema`, `diferenciais` e `material_tecnico` (nunca
 * `faq`/`hero`, mexidas por
 * `infrastructure/mysql/content-sections.repository.test.ts`, para não
 * colidir se os dois arquivos rodarem em paralelo no mesmo processo do
 * Vitest) e restaura o estado original delas em `afterAll`, para não vazar
 * dado mutado entre execuções da suíte.
 */
describe('Content (e2e) — GET /api/content + /api/admin/sections*', () => {
  const email = `operador.content.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let repositorioDireto: MySqlContentSectionsRepository;
  let operadorId: string;
  let accessToken: string;

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);
    repositorioDireto = new MySqlContentSectionsRepository(pool);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const auth = await criarOperadorAutenticadoDeTeste(app, operadoresRepository, { email, senha });
    operadorId = auth.operadorId;
    accessToken = auth.accessToken;
  }, 20_000);

  afterAll(async () => {
    // Restaura 'problema' e 'diferenciais' (mutadas pelos testes de PUT
    // abaixo) ao conteúdo inicial de @ketochlor/content-schema, publicadas,
    // sem itemVisibility — para não vazar estado entre execuções locais da
    // suíte.
    await repositorioDireto.atualizarConteudo(
      'problema',
      CONTENT_SECTIONS.problema.initialContent,
      {},
      null,
    );
    const problemaAtual = await repositorioDireto.buscarPorChave('problema');
    if (problemaAtual && !problemaAtual.isPublished) {
      await repositorioDireto.alternarPublicacao('problema', null);
    }

    await repositorioDireto.atualizarConteudo(
      'diferenciais',
      CONTENT_SECTIONS.diferenciais.initialContent,
      {},
      null,
    );

    // Restaura `material_tecnico` (mutada pelo teste de visibilidade abaixo)
    // ao conteúdo inicial de @ketochlor/content-schema, publicada, sem
    // itemVisibility — mesmo critério de 'problema'/'diferenciais' acima.
    // (Achado da tarefa `ajustes/migracao-mysql-verificacao-ponta-a-ponta`:
    // antes desta correção, este `afterAll` restaurava para `data: {}`, o
    // estado pristino de ANTES do seed real de conteúdo existir — rodar esta
    // suíte contra o MySQL já semeado com conteúdo real apagava
    // permanentemente o conteúdo real de `material_tecnico`.)
    const materialTecnicoAtual = await repositorioDireto.buscarPorChave('material_tecnico');
    if (materialTecnicoAtual && !materialTecnicoAtual.isPublished) {
      await repositorioDireto.alternarPublicacao('material_tecnico', null);
    }
    await repositorioDireto.atualizarConteudo(
      'material_tecnico',
      CONTENT_SECTIONS.material_tecnico.initialContent,
      {},
      null,
    );

    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

  describe('GET /api/content (pública)', () => {
    it('responde 200 sem nenhum header de autenticação', async () => {
      await request(app.getHttpServer()).get('/api/content').expect(200);
    });

    it('devolve as 11 chaves de seção conhecidas, cada uma presente (nunca omitida)', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/content');
      const chavesEsperadas = Object.keys(CONTENT_SECTIONS) as SectionKey[];

      expect(Object.keys(resposta.body.sections).sort()).toEqual([...chavesEsperadas].sort());
    });
  });

  describe('autenticação das rotas administrativas', () => {
    it('rejeita GET /api/admin/sections sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/sections').expect(401);
    });

    it('rejeita GET /api/admin/sections/:key sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/sections/problema').expect(401);
    });

    it('rejeita PUT /api/admin/sections/:key sem token', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/sections/problema')
        .send({ data: CONTENT_SECTIONS.problema.initialContent })
        .expect(401);
    });

    it('rejeita PATCH /api/admin/sections/:key/visibility sem token', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/sections/problema/visibility')
        .expect(401);
    });
  });

  describe('GET /api/admin/sections/:key', () => {
    it('devolve 404 para uma chave que não é uma das 11 seções fechadas', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/admin/sections/chave-invalida')
        .set('Authorization', authHeader());

      expect(resposta.status).toBe(404);
    });
  });

  describe('PUT /api/admin/sections/:key — validação', () => {
    it('recusa data inválido (falta o campo obrigatório "paragraphs" de problema) com 422 e a lista de erros', async () => {
      const { paragraphs: _paragraphs, ...problemaSemParagraphs } =
        CONTENT_SECTIONS.problema.initialContent;

      const resposta = await request(app.getHttpServer())
        .put('/api/admin/sections/problema')
        .set('Authorization', authHeader())
        .send({ data: problemaSemParagraphs });

      expect(resposta.status).toBe(422);
      expect(Array.isArray(resposta.body.erros)).toBe(true);
      expect(resposta.body.erros.length).toBeGreaterThan(0);
      expect(
        resposta.body.erros.some((erro: { campo: string }) => erro.campo.includes('paragraphs')),
      ).toBe(true);
    });
  });

  describe('PUT /api/admin/sections/:key → reflexo imediato em GET /api/content (integração de ponta a ponta)', () => {
    it('salva um data válido, preenche updatedBy a partir do usuário autenticado, e reflete no GET público', async () => {
      const novoConteudo = {
        ...CONTENT_SECTIONS.problema.initialContent,
        heading: `Heading alterado no teste e2e ${randomUUID()}`,
      };

      const respostaPut = await request(app.getHttpServer())
        .put('/api/admin/sections/problema')
        .set('Authorization', authHeader())
        .send({ data: novoConteudo });

      expect(respostaPut.status).toBe(200);
      expect(respostaPut.body.data.heading).toBe(novoConteudo.heading);
      expect(respostaPut.body.updatedBy).toBe(operadorId);

      const respostaGetPublico = await request(app.getHttpServer()).get('/api/content');
      expect(respostaGetPublico.body.sections.problema.heading).toBe(novoConteudo.heading);

      const respostaGetAdmin = await request(app.getHttpServer())
        .get('/api/admin/sections/problema')
        .set('Authorization', authHeader());
      expect(respostaGetAdmin.body.data.heading).toBe(novoConteudo.heading);
    });

    it('itens marcados como não visíveis em itemVisibility somem do GET público, mas continuam no documento completo do admin', async () => {
      const conteudoCompleto = CONTENT_SECTIONS.diferenciais.initialContent;
      // Oculta só o segundo item (índice 1) dos 4 de `diferenciais`.
      const itemVisibility = { items: [true, false, true, true] };

      await request(app.getHttpServer())
        .put('/api/admin/sections/diferenciais')
        .set('Authorization', authHeader())
        .send({ data: conteudoCompleto, itemVisibility })
        .expect(200);

      const respostaGetPublico = await request(app.getHttpServer()).get('/api/content');
      const itemsPublicos = respostaGetPublico.body.sections.diferenciais.items;
      expect(itemsPublicos).toHaveLength(3);
      expect(itemsPublicos).not.toContainEqual(conteudoCompleto.items[1]);

      const respostaGetAdmin = await request(app.getHttpServer())
        .get('/api/admin/sections/diferenciais')
        .set('Authorization', authHeader());
      expect(respostaGetAdmin.body.data.items).toHaveLength(4);
      expect(respostaGetAdmin.body.itemVisibility).toEqual(itemVisibility);
    });
  });

  describe('PATCH /api/admin/sections/:key/visibility → reflexo imediato em GET /api/content', () => {
    it('alterna is_published e o efeito aparece em GET /api/content', async () => {
      // Escreve o conteúdo inicial real de `material_tecnico` primeiro — a
      // migração do conteúdo real do Ketochlor é uma tarefa futura, então
      // este teste não pode presumir que a seção já tem o conteúdo de
      // `@ketochlor/content-schema`; ele mesmo o estabelece, para poder
      // afirmar que ele "volta inalterado" ao reativar a seção.
      await request(app.getHttpServer())
        .put('/api/admin/sections/material_tecnico')
        .set('Authorization', authHeader())
        .send({ data: CONTENT_SECTIONS.material_tecnico.initialContent })
        .expect(200);

      const antes = await request(app.getHttpServer())
        .get('/api/admin/sections/material_tecnico')
        .set('Authorization', authHeader());
      expect(antes.body.isPublished).toBe(true);

      const respostaPatch = await request(app.getHttpServer())
        .patch('/api/admin/sections/material_tecnico/visibility')
        .set('Authorization', authHeader());
      expect(respostaPatch.status).toBe(200);
      expect(respostaPatch.body.isPublished).toBe(false);

      const respostaGetPublicoOculta = await request(app.getHttpServer()).get('/api/content');
      expect(respostaGetPublicoOculta.body.sections.material_tecnico).toBeNull();

      // Reativa — o conteúdo volta inalterado (SDD § Critérios de aceitação
      // — "Controle de visibilidade").
      const respostaPatchDeVolta = await request(app.getHttpServer())
        .patch('/api/admin/sections/material_tecnico/visibility')
        .set('Authorization', authHeader());
      expect(respostaPatchDeVolta.body.isPublished).toBe(true);

      const respostaGetPublicoDeVolta = await request(app.getHttpServer()).get('/api/content');
      expect(respostaGetPublicoDeVolta.body.sections.material_tecnico).toEqual(
        CONTENT_SECTIONS.material_tecnico.initialContent,
      );
    });

    it('devolve 404 para uma chave que não é uma das 11 seções fechadas', async () => {
      const resposta = await request(app.getHttpServer())
        .patch('/api/admin/sections/chave-invalida/visibility')
        .set('Authorization', authHeader());

      expect(resposta.status).toBe(404);
    });
  });
});
