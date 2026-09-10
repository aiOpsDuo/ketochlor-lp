import type { ErroValidacaoCampo, ResultadoValidacao } from '../shared/resultado-validacao';

/**
 * Corpo aceito de `PUT /api/admin/metadata` (SDD § Contratos de dados/API/
 * interfaces; § Modelo de dados — `site_metadata`). Sem esquema Zod
 * compartilhado como o das 11 seções (`@ketochlor/content-schema` só cobre
 * conteúdo editorial, não a tabela `site_metadata`).
 *
 * **Decisão de validação (tarefa `api/modulo-metadata`): Domínio, não
 * `class-validator`/DTO decorado na Apresentação.** Segue exatamente o
 * mesmo precedente de `validarLead` (`domain/leads/validar-lead.ts`) — outro
 * caso, já existente neste código, de payload sem esquema compartilhado.
 * Motivos: (1) `class-validator`/`class-transformer` não são dependências de
 * `apps/api` (ver comentário em `presentation/content/atualizar-secao.dto.ts`)
 * — adicioná-las só para este payload de 3 campos duplicaria, com uma
 * biblioteca nova, o que uma função pura já resolve; (2) manter a regra de
 * dependência estrita do SDD (§ Camadas — "nenhum controller contém regra de
 * negócio"): a Apresentação só traduz HTTP↔caso de uso, a regra de "não
 * vazio" é regra de negócio do registro `site_metadata`, pertence ao
 * Domínio, como toda outra invariante deste código.
 */
export interface SiteMetadataPayloadBruto {
  title: string;
  description: string;
  /**
   * `null` (ou string vazia) remove a imagem de compartilhamento; string
   * precisa ser uma URL `http(s)://` já pronta para uso em
   * `<meta property="og:image">` — nunca mais um id de `media_assets` (ver
   * comentário de decisão em `validarSiteMetadata`, abaixo).
   */
  ogImageUrl: string | null;
}

export type SiteMetadataValidada = SiteMetadataPayloadBruto;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

/**
 * `true` só para uma URL absoluta `http(s)://`. Local a este arquivo (não
 * promovida a `domain/shared`) porque `ogImageUrl` é hoje a única invariante
 * da API que precisa desta checagem — generalizar antes de um segundo uso
 * real criaria abstração especulativa. Mesma ideia de `ehUrlAbsolutaHttp`
 * (`apps/lp/scripts/injetar-metadados.mjs`), reimplementada aqui em vez de
 * importada porque API e LP não compartilham nenhum pacote de utilitários
 * (`@ketochlor/content-schema`, o único pacote comum, cobre esquema de
 * conteúdo de seção, não `site_metadata`).
 */
function ehUrlHttpValida(valor: string): boolean {
  return /^https?:\/\//i.test(valor.trim());
}

/**
 * Invariantes de `site_metadata` (SDD § Modelo de dados): `title` e
 * `description` obrigatórios e não vazios (após `trim`). `PUT
 * /api/admin/metadata` é substituição integral do registro único — mesma
 * semântica de "substitui" já declarada por `SiteMetadataRepository.atualizar`
 * (Domínio) e usada por `PUT /api/admin/sections/:key` — por isso os dois
 * são sempre exigidos, nunca validados só "quando informados no corpo": não
 * há conceito de atualização parcial nesta rota.
 *
 * **Correção da tarefa `ajustes/corrige-imagem-metadados` (achado de QA):**
 * `ogImageUrl` (antes `ogImageMediaId`, um `uuid` que nenhuma rota da API
 * jamais preenchia de verdade — ver migration
 * `20260910120000_rename_site_metadata_og_image_to_url.sql`) agora é
 * validada como URL: `null` ou string vazia/só espaços seguem significando
 * "sem imagem de compartilhamento" (o único campo que aceita ausência de
 * valor); uma string não vazia precisa começar com `http://` ou `https://`,
 * senão a requisição é recusada com `422` — mesma rede de segurança que já
 * protege `title`/`description`, agora estendida a um formato, não só a
 * "não vazio".
 */
export function validarSiteMetadata(
  payload: SiteMetadataPayloadBruto,
): ResultadoValidacao<SiteMetadataValidada> {
  const erros: ErroValidacaoCampo[] = [];

  const title = payload.title?.trim() ?? '';
  if (title.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('title'));
  }

  const description = payload.description?.trim() ?? '';
  if (description.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('description'));
  }

  let ogImageUrl: string | null = null;
  const ogImageUrlBruto = payload.ogImageUrl ?? null;
  if (ogImageUrlBruto !== null) {
    if (typeof ogImageUrlBruto !== 'string') {
      erros.push({
        campo: 'ogImageUrl',
        mensagem: 'O campo "ogImageUrl" deve ser uma URL (texto) ou nulo.',
      });
    } else {
      const valorAparado = ogImageUrlBruto.trim();
      if (valorAparado.length > 0) {
        if (ehUrlHttpValida(valorAparado)) {
          ogImageUrl = valorAparado;
        } else {
          erros.push({
            campo: 'ogImageUrl',
            mensagem: 'O campo "ogImageUrl" deve ser uma URL http(s) válida, ou nulo.',
          });
        }
      }
      // Vazio/só espaços: `ogImageUrl` permanece `null` — mesma tolerância
      // de "string vazia remove a imagem" já esperada pelo formulário do
      // painel, que envia `null` nesse caso, mas sem exigir esse cuidado de
      // quem mais chamar a API diretamente.
    }
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  return { sucesso: true, dado: { title, description, ogImageUrl } };
}
