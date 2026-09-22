import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarMysqlPool } from './mysql-client.factory';
import { MySqlSiteMetadataRepository } from './site-metadata.repository';
import type { SiteMetadataPersistido } from '../../domain/portas/site-metadata.repository';
import { carregarMysqlTestEnv } from '../test-support/mysql-test-env';

describe('MySqlSiteMetadataRepository (infra)', () => {
  let pool: Pool;
  let repositorio: MySqlSiteMetadataRepository;
  let estadoOriginal: SiteMetadataPersistido;

  beforeAll(async () => {
    // Timeout maior que o default do vitest (5s) — teste de INTEGRAÇÃO real
    // contra um MySQL de verdade, ver comentário equivalente em
    // `content-sections.repository.test.ts`.
    vi.setConfig({ testTimeout: 20_000 });
    pool = criarMysqlPool(carregarMysqlTestEnv());
    repositorio = new MySqlSiteMetadataRepository(pool);
    // Lido ANTES de qualquer teste escrever no registro único (`id = 1`) —
    // restaurado em `afterAll` abaixo.
    estadoOriginal = await repositorio.buscar();
  });

  afterAll(async () => {
    // Restaura o registro único ao estado lido antes de qualquer teste
    // deste arquivo. (Achado da tarefa
    // `ajustes/migracao-mysql-verificacao-ponta-a-ponta`: antes desta
    // correção, este arquivo nunca restaurava `site_metadata` — rodar esta
    // suíte contra o MySQL já semeado com conteúdo real apagava
    // permanentemente o título/descrição/imagem reais.)
    await repositorio.atualizar({
      title: estadoOriginal.title,
      description: estadoOriginal.description,
      ogImageUrl: estadoOriginal.ogImageUrl,
      updatedBy: estadoOriginal.updatedBy,
    });

    await pool.end();
  });

  it('lê o registro único semeado pela migration', async () => {
    const metadata = await repositorio.buscar();
    expect(metadata).toMatchObject({ title: expect.any(String), description: expect.any(String) });
  });

  it('atualiza o registro único (id=1) e reflete na próxima leitura', async () => {
    const operadorId = randomUUID();
    const atualizado = await repositorio.atualizar({
      title: 'Ketochlor® — título de teste de integração MySQL',
      description: 'Descrição de teste de integração MySQL.',
      ogImageUrl: null,
      updatedBy: operadorId,
    });

    expect(atualizado.title).toBe('Ketochlor® — título de teste de integração MySQL');
    expect(atualizado.updatedBy).toBe(operadorId);

    const relido = await repositorio.buscar();
    expect(relido.title).toBe('Ketochlor® — título de teste de integração MySQL');
    expect(relido.description).toBe('Descrição de teste de integração MySQL.');
  });

  it('atualiza e lê de volta uma URL de imagem não nula', async () => {
    const atualizado = await repositorio.atualizar({
      title: 'Título',
      description: 'Descrição',
      ogImageUrl: 'https://exemplo.com/imagem.png',
      updatedBy: null,
    });
    expect(atualizado.ogImageUrl).toBe('https://exemplo.com/imagem.png');

    const relido = await repositorio.buscar();
    expect(relido.ogImageUrl).toBe('https://exemplo.com/imagem.png');
  });
});
