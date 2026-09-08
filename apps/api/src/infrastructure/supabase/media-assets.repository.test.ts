import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarSupabaseAdminClient } from './supabase-client.factory';
import { SupabaseMediaAssetsRepository } from './media-assets.repository';
import { carregarSupabaseTestEnv } from '../test-support/supabase-test-env';

describe('SupabaseMediaAssetsRepository (infra)', () => {
  let client: SupabaseClient;
  let bucket: string;
  let repositorio: SupabaseMediaAssetsRepository;

  beforeAll(() => {
    const env = carregarSupabaseTestEnv();
    client = criarSupabaseAdminClient(env);
    bucket = env.storageBucket;
    repositorio = new SupabaseMediaAssetsRepository(client, bucket);
  });

  it('emite uma credencial de upload e cria o registro só depois do upload confirmado', async () => {
    const credencial = await repositorio.emitirCredencialUpload({
      originalFilename: 'selo-teste.png',
      mimeType: 'image/png',
    });

    expect(credencial.mediaAssetId).toBeTruthy();
    expect(credencial.storagePath).toBe(`${credencial.mediaAssetId}.png`);
    expect(credencial.signedUrl).toBeTruthy();
    expect(credencial.token).toBeTruthy();

    // Confirma que nenhuma linha nasce em media_assets antes do upload
    // (SDD § Riscos técnicos: upload interrompido não pode deixar referência
    // a um arquivo inexistente).
    const { data: antesDoUpload } = await client
      .from('media_assets')
      .select('id')
      .eq('id', credencial.mediaAssetId)
      .maybeSingle();
    expect(antesDoUpload).toBeNull();

    // Upload real dos bytes direto ao Storage local, usando a credencial
    // emitida — exercita o mesmo caminho que o navegador do painel usaria.
    const bytesDePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const { error: erroUpload } = await client.storage
      .from(bucket)
      .uploadToSignedUrl(credencial.storagePath, credencial.token, bytesDePng, {
        contentType: 'image/png',
      });
    expect(erroUpload).toBeNull();

    const registro = await repositorio.criar({
      id: credencial.mediaAssetId,
      storagePath: credencial.storagePath,
      mimeType: 'image/png',
      sizeBytes: bytesDePng.byteLength,
      originalFilename: 'selo-teste.png',
      width: 1,
      height: 1,
      createdBy: null,
    });

    expect(registro.id).toBe(credencial.mediaAssetId);
    expect(registro.storagePath).toBe(credencial.storagePath);
    expect(registro.publicUrl).toContain(bucket);
    expect(registro.publicUrl).toContain(credencial.storagePath);

    await client.storage.from(bucket).remove([credencial.storagePath]);
    await client.from('media_assets').delete().eq('id', credencial.mediaAssetId);
  });
});
