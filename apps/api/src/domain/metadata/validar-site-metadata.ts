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
  /** `null` remove a imagem de compartilhamento; string referencia um `media_assets.id`. */
  ogImageMediaId: string | null;
}

export type SiteMetadataValidada = SiteMetadataPayloadBruto;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

/**
 * Invariantes de `site_metadata` (SDD § Modelo de dados): `title` e
 * `description` obrigatórios e não vazios (após `trim`). `PUT
 * /api/admin/metadata` é substituição integral do registro único — mesma
 * semântica de "substitui" já declarada por `SiteMetadataRepository.atualizar`
 * (Domínio) e usada por `PUT /api/admin/sections/:key` — por isso os dois
 * são sempre exigidos, nunca validados só "quando informados no corpo": não
 * há conceito de atualização parcial nesta rota. `ogImageMediaId` é o único
 * campo que aceita ausência de valor: `null` (ou `undefined` no corpo)
 * significa "sem imagem de compartilhamento".
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

  const ogImageMediaId = payload.ogImageMediaId ?? null;
  if (ogImageMediaId !== null && typeof ogImageMediaId !== 'string') {
    erros.push({
      campo: 'ogImageMediaId',
      mensagem: 'O campo "ogImageMediaId" deve ser um id de mídia (texto) ou nulo.',
    });
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  return { sucesso: true, dado: { title, description, ogImageMediaId } };
}
