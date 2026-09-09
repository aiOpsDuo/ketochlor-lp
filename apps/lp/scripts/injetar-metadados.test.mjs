import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ehUrlAbsolutaHttp,
  escaparAtributoHtml,
  escaparTextoHtml,
  injetarMetadados,
  injetarMetadadosNoBuild,
  substituirOuInserirDescription,
  substituirOuInserirOgImage,
  substituirTitle,
} from './injetar-metadados.mjs';

const HTML_BASE = [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <title>Título default do repositório</title>',
  '    <meta name="description" content="Descrição default do repositório." />',
  '  </head>',
  '  <body class="font-body text-navy antialiased">',
  '    <div id="root"></div>',
  '  </body>',
  '</html>',
].join('\n');

describe('escaparTextoHtml / escaparAtributoHtml', () => {
  it('escapa &, < e > em texto', () => {
    expect(escaparTextoHtml('A & B <script>')).toBe('A &amp; B &lt;script&gt;');
  });

  it('escapa também aspas duplas em atributo', () => {
    expect(escaparAtributoHtml('Diz "olá" & tchau')).toBe('Diz &quot;olá&quot; &amp; tchau');
  });
});

describe('ehUrlAbsolutaHttp', () => {
  it.each(['http://exemplo.com/img.png', 'https://exemplo.com/img.png'])(
    'aceita URL absoluta http(s): %s',
    (url) => {
      expect(ehUrlAbsolutaHttp(url)).toBe(true);
    },
  );

  it.each([null, undefined, '', 'media-id-123', '/relativo.png', 'ftp://exemplo.com/img.png'])(
    'rejeita id cru, caminho relativo ou valor não-http: %p',
    (valor) => {
      expect(ehUrlAbsolutaHttp(valor)).toBe(false);
    },
  );
});

describe('substituirTitle', () => {
  it('substitui o conteúdo de <title> existente, escapando o novo valor', () => {
    const resultado = substituirTitle(HTML_BASE, 'Novo <título> & cia');
    expect(resultado).toContain('<title>Novo &lt;título&gt; &amp; cia</title>');
    expect(resultado).not.toContain('Título default do repositório');
  });

  it('não quebra o HTML quando não há <title>', () => {
    const semTitle = HTML_BASE.replace('<title>Título default do repositório</title>', '');
    expect(substituirTitle(semTitle, 'Novo título')).toBe(semTitle);
  });
});

describe('substituirOuInserirDescription', () => {
  it('substitui o content de uma <meta name="description"> já existente', () => {
    const resultado = substituirOuInserirDescription(HTML_BASE, 'Nova descrição.');
    expect(resultado).toContain('<meta name="description" content="Nova descrição.">');
    expect(resultado).not.toContain('Descrição default do repositório.');
  });

  it('insere a tag antes de </head> quando ela não existe', () => {
    const semDescription = HTML_BASE.replace(
      '    <meta name="description" content="Descrição default do repositório." />\n',
      '',
    );
    const resultado = substituirOuInserirDescription(semDescription, 'Descrição inserida.');
    expect(resultado).toContain('<meta name="description" content="Descrição inserida.">');
    expect(resultado.indexOf('<meta name="description"')).toBeLessThan(resultado.indexOf('</head>'));
  });
});

describe('substituirOuInserirOgImage', () => {
  it('insere <meta property="og:image"> quando ainda não existe', () => {
    const resultado = substituirOuInserirOgImage(HTML_BASE, 'https://exemplo.com/social.png');
    expect(resultado).toContain(
      '<meta property="og:image" content="https://exemplo.com/social.png">',
    );
  });

  it('substitui uma <meta property="og:image"> já existente', () => {
    const comOgImage = HTML_BASE.replace(
      '</head>',
      '<meta property="og:image" content="https://antigo.com/a.png" />\n  </head>',
    );
    const resultado = substituirOuInserirOgImage(comOgImage, 'https://novo.com/b.png');
    expect(resultado).toContain('<meta property="og:image" content="https://novo.com/b.png">');
    expect(resultado).not.toContain('antigo.com');
  });
});

describe('injetarMetadados', () => {
  it('aplica title, description e og:image quando os três estão preenchidos e og:image é URL http', () => {
    const resultado = injetarMetadados(HTML_BASE, {
      title: 'Título real',
      description: 'Descrição real.',
      ogImageMediaId: 'https://exemplo.com/social.png',
    });

    expect(resultado).toContain('<title>Título real</title>');
    expect(resultado).toContain('<meta name="description" content="Descrição real.">');
    expect(resultado).toContain(
      '<meta property="og:image" content="https://exemplo.com/social.png">',
    );
  });

  it('mantém os defaults do index.html quando metadata está ausente', () => {
    expect(injetarMetadados(HTML_BASE, undefined)).toBe(HTML_BASE);
  });

  it('mantém os defaults quando os campos de metadata estão vazios ou só espaços', () => {
    const resultado = injetarMetadados(HTML_BASE, {
      title: '   ',
      description: '',
      ogImageMediaId: null,
    });
    expect(resultado).toBe(HTML_BASE);
  });

  it('ignora ogImageMediaId quando é um id cru (não uma URL), sem quebrar o HTML', () => {
    const resultado = injetarMetadados(HTML_BASE, {
      title: 'Título real',
      description: 'Descrição real.',
      ogImageMediaId: 'media-id-cru-123',
    });
    expect(resultado).toContain('<title>Título real</title>');
    expect(resultado).not.toContain('og:image');
  });
});

describe('injetarMetadadosNoBuild', () => {
  let dirTemp;
  let snapshotPath;
  let indexHtmlPath;

  beforeEach(async () => {
    dirTemp = await mkdtemp(join(tmpdir(), 'injetar-metadados-'));
    snapshotPath = join(dirTemp, 'content-snapshot.json');
    indexHtmlPath = join(dirTemp, 'index.html');
    await writeFile(indexHtmlPath, HTML_BASE, 'utf-8');
  });

  afterEach(async () => {
    await rm(dirTemp, { recursive: true, force: true });
  });

  it('reescreve dist/index.html com os metadados do instantâneo', async () => {
    await writeFile(
      snapshotPath,
      JSON.stringify({
        sections: {},
        metadata: {
          title: 'Ketochlor real',
          description: 'Descrição publicada real.',
          ogImageMediaId: 'https://exemplo.com/og.png',
        },
      }),
      'utf-8',
    );

    const resultado = await injetarMetadadosNoBuild({ snapshotPath, indexHtmlPath });

    expect(resultado).toEqual({ injetado: true });
    const htmlFinal = await readFile(indexHtmlPath, 'utf-8');
    expect(htmlFinal).toContain('<title>Ketochlor real</title>');
    expect(htmlFinal).toContain('<meta name="description" content="Descrição publicada real.">');
    expect(htmlFinal).toContain('<meta property="og:image" content="https://exemplo.com/og.png">');
  });

  it('não falha e mantém o index.html quando o instantâneo não existe', async () => {
    const avisoConsole = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const resultado = await injetarMetadadosNoBuild({ snapshotPath, indexHtmlPath });

    expect(resultado.injetado).toBe(false);
    expect(await readFile(indexHtmlPath, 'utf-8')).toBe(HTML_BASE);
    expect(avisoConsole).toHaveBeenCalled();
    avisoConsole.mockRestore();
  });

  it('não falha e mantém o index.html quando metadata está vazio no instantâneo', async () => {
    await writeFile(
      snapshotPath,
      JSON.stringify({ sections: {}, metadata: { title: '', description: '', ogImageMediaId: null } }),
      'utf-8',
    );

    const resultado = await injetarMetadadosNoBuild({ snapshotPath, indexHtmlPath });

    expect(resultado).toEqual({ injetado: false, motivo: 'metadata vazio' });
    expect(await readFile(indexHtmlPath, 'utf-8')).toBe(HTML_BASE);
  });
});
