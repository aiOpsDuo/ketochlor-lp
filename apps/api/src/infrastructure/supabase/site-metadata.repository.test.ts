import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarSupabaseAdminClient } from './supabase-client.factory';
import { SupabaseSiteMetadataRepository } from './site-metadata.repository';
import { carregarSupabaseTestEnv } from '../test-support/supabase-test-env';

describe('SupabaseSiteMetadataRepository (infra)', () => {
  let client: SupabaseClient;
  let repositorio: SupabaseSiteMetadataRepository;

  beforeAll(() => {
    client = criarSupabaseAdminClient(carregarSupabaseTestEnv());
    repositorio = new SupabaseSiteMetadataRepository(client);
  });

  it('lê o registro único semeado pela migration', async () => {
    const metadata = await repositorio.buscar();
    expect(metadata).toMatchObject({ title: expect.any(String), description: expect.any(String) });
  });

  it('atualiza o registro único e reflete na próxima leitura', async () => {
    const operadorId = randomUUID();
    const atualizado = await repositorio.atualizar({
      title: 'Ketochlor® — título de teste de integração',
      description: 'Descrição de teste de integração.',
      ogImageMediaId: null,
      updatedBy: operadorId,
    });

    expect(atualizado.title).toBe('Ketochlor® — título de teste de integração');
    expect(atualizado.updatedBy).toBe(operadorId);

    const relido = await repositorio.buscar();
    expect(relido.title).toBe('Ketochlor® — título de teste de integração');
    expect(relido.description).toBe('Descrição de teste de integração.');
  });
});
