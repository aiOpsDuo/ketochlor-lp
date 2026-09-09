import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONTENT_SECTIONS } from '@ketochlor/content-schema';
import {
  ehConteudoPublicadoValido,
  formatarInstantaneo,
  gerarInstantaneo,
} from './gerar-instantaneo-de-conteudo.mjs';

/** `sections` com as 11 chaves fechadas presentes (valores triviais — só a forma importa aqui). */
function secoesValidas() {
  return Object.fromEntries(Object.keys(CONTENT_SECTIONS).map((chave) => [chave, null]));
}

describe('ehConteudoPublicadoValido', () => {
  it('aceita um objeto com as 11 chaves de sections e metadata', () => {
    expect(
      ehConteudoPublicadoValido({ sections: secoesValidas(), metadata: { title: '' } }),
    ).toBe(true);
  });

  it('rejeita sections de outro serviço (mesma forma de topo, chaves de seção diferentes) — regressão do risco de sobrescrever o instantâneo com conteúdo de outro produto ao apontar para uma URL/porta errada', () => {
    expect(
      ehConteudoPublicadoValido({
        sections: { hero: {}, onde_comprar: {}, demonstracao: {} },
        metadata: { title: 'Outro produto' },
      }),
    ).toBe(false);
  });

  it.each([
    null,
    undefined,
    42,
    'texto',
    {},
    { sections: {} },
    { metadata: {} },
    { sections: null, metadata: {} },
    { sections: { hero: null }, metadata: {} },
  ])('rejeita forma inválida: %p', (valor) => {
    expect(ehConteudoPublicadoValido(valor)).toBe(false);
  });
});

describe('formatarInstantaneo', () => {
  it('formata com indentação de 2 espaços e quebra de linha final', () => {
    const formatado = formatarInstantaneo({ a: 1 });
    expect(formatado).toBe('{\n  "a": 1\n}\n');
  });
});

describe('gerarInstantaneo', () => {
  let dirTemp;
  let snapshotPath;
  const conteudoAnterior = {
    sections: { ...secoesValidas(), hero: 'antigo' },
    metadata: { title: 'antigo' },
  };

  beforeEach(async () => {
    dirTemp = await mkdtemp(join(tmpdir(), 'content-snapshot-'));
    snapshotPath = join(dirTemp, 'content-snapshot.json');
    await writeFile(snapshotPath, formatarInstantaneo(conteudoAnterior), 'utf-8');
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(dirTemp, { recursive: true, force: true });
  });

  it('sobrescreve o instantâneo quando a API responde com sucesso', async () => {
    const conteudoNovo = { sections: { ...secoesValidas(), hero: 'novo' }, metadata: { title: 'novo' } };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => conteudoNovo,
      }),
    );

    const resultado = await gerarInstantaneo({ apiUrl: 'http://api.invalida/api/content', snapshotPath });

    expect(resultado).toEqual({ atualizado: true });
    const gravado = JSON.parse(await readFile(snapshotPath, 'utf-8'));
    expect(gravado).toEqual(conteudoNovo);
  });

  it('mantém o instantâneo existente quando a API está indisponível (erro de rede)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const avisoConsole = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const resultado = await gerarInstantaneo({ apiUrl: 'http://api.invalida/api/content', snapshotPath });

    expect(resultado.atualizado).toBe(false);
    const mantido = JSON.parse(await readFile(snapshotPath, 'utf-8'));
    expect(mantido).toEqual(conteudoAnterior);
    expect(avisoConsole).toHaveBeenCalled();
    avisoConsole.mockRestore();
  });

  it('mantém o instantâneo existente quando a API responde com status de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const resultado = await gerarInstantaneo({ apiUrl: 'http://api.invalida/api/content', snapshotPath });

    expect(resultado.atualizado).toBe(false);
    const mantido = JSON.parse(await readFile(snapshotPath, 'utf-8'));
    expect(mantido).toEqual(conteudoAnterior);
  });

  it('mantém o instantâneo existente quando a resposta tem formato inesperado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => ({ foo: 'bar' }) }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const resultado = await gerarInstantaneo({ apiUrl: 'http://api.invalida/api/content', snapshotPath });

    expect(resultado.atualizado).toBe(false);
    const mantido = JSON.parse(await readFile(snapshotPath, 'utf-8'));
    expect(mantido).toEqual(conteudoAnterior);
  });
});
