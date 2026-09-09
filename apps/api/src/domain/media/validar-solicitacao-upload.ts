import type { ErroValidacaoCampo, ResultadoValidacao } from '../shared/resultado-validacao';

/**
 * Corpo aceito de `POST /api/admin/media/upload-url` (SDD § Contratos de
 * dados/API/interfaces; § Decisões técnicas e trade-offs — "Upload direto do
 * navegador para o Storage, com credencial temporária emitida pela API"). Só
 * os metadados necessários para o repositório de Infraestrutura reservar o
 * `id`/`storagePath` e emitir a credencial — a API nunca recebe os bytes do
 * arquivo em si.
 *
 * **Decisão de validação (tarefa `api/modulo-media`): Domínio, não
 * `class-validator`/DTO decorado na Apresentação.** Mesmo precedente de
 * `validarSiteMetadata`/`validarLead`: (1) `class-validator`/
 * `class-transformer` não são dependências de `apps/api`; (2) "só imagem,
 * sem vídeo nesta versão" (PRD § Fora de escopo; SDD — linguagem ubíqua,
 * "Mídia") é uma regra de NEGÓCIO do que o CMS aceita como mídia, não uma
 * checagem de forma de payload — pertence ao Domínio, como toda outra
 * invariante deste código (SDD § Camadas — "nenhum controller contém regra
 * de negócio").
 */
export interface SolicitacaoUploadBruta {
  originalFilename: string;
  mimeType: string;
}

export type SolicitacaoUploadValidada = SolicitacaoUploadBruta;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

const PREFIXO_MIME_IMAGEM = 'image/';

/**
 * Invariantes da solicitação de upload: `originalFilename` obrigatório e não
 * vazio (após `trim`); `mimeType` obrigatório e precisa começar com
 * `"image/"` — não há suporte a vídeo nesta versão do Ketochlor (PRD § Fora
 * de escopo; SDD — linguagem ubíqua, "Mídia").
 */
export function validarSolicitacaoUpload(
  payload: SolicitacaoUploadBruta,
): ResultadoValidacao<SolicitacaoUploadValidada> {
  const erros: ErroValidacaoCampo[] = [];

  const originalFilename = payload.originalFilename?.trim() ?? '';
  if (originalFilename.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('originalFilename'));
  }

  const mimeType = payload.mimeType?.trim() ?? '';
  if (mimeType.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('mimeType'));
  } else if (!mimeType.startsWith(PREFIXO_MIME_IMAGEM)) {
    erros.push({
      campo: 'mimeType',
      mensagem:
        'Só é permitido enviar imagens: "mimeType" deve começar com "image/" — não há suporte a vídeo nesta versão do Ketochlor.',
    });
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  return { sucesso: true, dado: { originalFilename, mimeType } };
}
