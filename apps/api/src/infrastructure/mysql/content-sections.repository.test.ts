import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarMysqlPool } from './mysql-client.factory';
import { MySqlContentSectionsRepository } from './content-sections.repository';
import { carregarMysqlTestEnv } from '../test-support/mysql-test-env';

/**
 * Testes de INTEGRAÇÃO reais contra o MySQL do `docker-compose.yml` — nunca
 * mocks do driver `mysql2` (mesmo critério de "pronto" já usado pelos
 * testes Supabase equivalentes, `content-sections.repository.test.ts` em
 * `../supabase`). Pré-requisito: `docker compose up -d mysql` no ar e o
 * schema já aplicado (`npm run migrate:mysql --prefix apps/api`).
 */
describe('MySqlContentSectionsRepository (infra)', () => {
  let pool: Pool;
  let repositorio: MySqlContentSectionsRepository;

  beforeAll(() => {
    // Timeout maior que o default do vitest (5s) para este arquivo: são
    // testes de INTEGRAÇÃO reais contra um MySQL de verdade (nunca mock),
    // então cada round-trip de rede/disco pesa mais do que um teste
    // unitário — ver `references/clean-code.md` § T9.
    vi.setConfig({ testTimeout: 20_000 });
    pool = criarMysqlPool(carregarMysqlTestEnv());
    repositorio = new MySqlContentSectionsRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('busca as 11 seções semeadas com uma única consulta', async () => {
    const secoes = await repositorio.buscarTodas();
    expect(secoes).toHaveLength(11);
    expect(secoes.map((s) => s.key)).toContain('faq');
  });

  it('grava e lê de volta data + itemVisibility na mesma seção', async () => {
    const operadorId = randomUUID();
    const novoConteudo = {
      eyebrow: 'FAQ TÉCNICO',
      heading: 'Perguntas frequentes (teste de integração MySQL)',
      perguntas: [
        { question: 'Pergunta 1?', answer: 'Resposta 1.' },
        { question: 'Pergunta 2?', answer: 'Resposta 2.' },
      ],
    };
    const visibilidade = { perguntas: [true, false] };

    const atualizado = await repositorio.atualizarConteudo(
      'faq',
      novoConteudo,
      visibilidade,
      operadorId,
    );

    expect(atualizado.data).toEqual(novoConteudo);
    expect(atualizado.itemVisibility).toEqual(visibilidade);
    expect(atualizado.updatedBy).toBe(operadorId);

    const relido = await repositorio.buscarPorChave('faq');
    expect(relido).not.toBeNull();
    expect(relido?.data).toEqual(novoConteudo);
    expect(relido?.itemVisibility).toEqual(visibilidade);
  });

  it('grava data e item_visibility na MESMA instrução UPDATE (contrato atômico da porta)', async () => {
    const executeSpy = vi.spyOn(pool, 'execute');

    await repositorio.atualizarConteudo(
      'faq',
      { eyebrow: 'Outro conteúdo', heading: 'x', perguntas: [] },
      { perguntas: [] },
      null,
    );

    const chamadasDeUpdate = executeSpy.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.trim().toUpperCase().startsWith('UPDATE'),
    );
    expect(chamadasDeUpdate).toHaveLength(1);

    const [sqlDoUpdate] = chamadasDeUpdate[0] as [string, unknown[]];
    expect(sqlDoUpdate).toContain('data = ?');
    expect(sqlDoUpdate).toContain('item_visibility = ?');

    executeSpy.mockRestore();
  });

  it('alterna is_published e persiste a inversão', async () => {
    const antes = await repositorio.buscarPorChave('hero');
    expect(antes).not.toBeNull();

    const depois = await repositorio.alternarPublicacao('hero', null);
    expect(depois.isPublished).toBe(!antes!.isPublished);

    const relido = await repositorio.buscarPorChave('hero');
    expect(relido?.isPublished).toBe(depois.isPublished);

    // Devolve ao estado original para não vazar estado entre execuções do teste.
    await repositorio.alternarPublicacao('hero', null);
  });

  it('devolve null para uma chave que não corresponde a nenhuma linha', async () => {
    // 'inexistente' nunca é uma SectionKey real, mas o repositório de
    // infraestrutura não valida isso (quem valida é o Domínio,
    // `ehChaveDeSecao`/`validarConteudoSecao`) — aqui só confirmamos que uma
    // chave sem linha correspondente não lança, devolve null.
    // @ts-expect-error — chave inválida de propósito, ver comentário acima.
    const secao = await repositorio.buscarPorChave('inexistente');
    expect(secao).toBeNull();
  });
});
