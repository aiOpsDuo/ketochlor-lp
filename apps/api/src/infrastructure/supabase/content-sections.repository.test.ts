import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarSupabaseAdminClient } from './supabase-client.factory';
import { SupabaseContentSectionsRepository } from './content-sections.repository';
import { carregarSupabaseTestEnv } from '../test-support/supabase-test-env';

/**
 * Testes de INTEGRAÇÃO reais contra o Supabase LOCAL — nunca mocks do SDK
 * (critério de "pronto" de `api/infra-supabase-adapters`). Pré-requisito:
 * `npx supabase start` já rodando (ver docs/BANCO-DE-DADOS.md).
 */
describe('SupabaseContentSectionsRepository (infra)', () => {
  let client: SupabaseClient;
  let repositorio: SupabaseContentSectionsRepository;

  beforeAll(() => {
    client = criarSupabaseAdminClient(carregarSupabaseTestEnv());
    repositorio = new SupabaseContentSectionsRepository(client);
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
      heading: 'Perguntas frequentes (teste de integração)',
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
