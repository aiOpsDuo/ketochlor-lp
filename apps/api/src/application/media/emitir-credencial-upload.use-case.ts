import { Inject, Injectable } from '@nestjs/common';
import type {
  CredencialUploadEmitida,
  ErroValidacaoCampo,
  MediaAssetsRepository,
} from '../../domain';
import { validarSolicitacaoUpload } from '../../domain';
import { MEDIA_ASSETS_REPOSITORY } from './media-assets-repository.token';

/** Corpo de `POST /api/admin/media/upload-url` (SDD § Contratos de dados/API/interfaces). */
export interface EmitirCredencialUploadInput {
  originalFilename: string;
  mimeType: string;
}

export type ResultadoEmissaoCredencialUpload =
  | { sucesso: true; credencial: CredencialUploadEmitida }
  | { sucesso: false; erros: ErroValidacaoCampo[] };

/**
 * Caso de uso de `POST /api/admin/media/upload-url` (autenticado). Valida o
 * corpo via `validarSolicitacaoUpload` (Domínio) ANTES de reservar qualquer
 * id/credencial — o controller nunca chama o repositório diretamente, mesmo
 * padrão de `AtualizarMetadataUseCase`/`AtualizarSecaoUseCase`.
 *
 * Só emite a credencial (`MediaAssetsRepository.emitirCredencialUpload`) —
 * NÃO cria o registro em `media_assets`. `MediaAssetsRepository.criar` (SDD
 * § Riscos técnicos — "Upload de imagem interrompido no meio do envio") é
 * chamado depois, quando o Storage confirma o upload; esta tarefa
 * (`api/modulo-media`) expõe só a emissão da credencial, único endpoint
 * declarado no SDD para este módulo — ver nota de decisão em
 * `presentation/media/media-admin.controller.ts`.
 */
@Injectable()
export class EmitirCredencialUploadUseCase {
  constructor(
    @Inject(MEDIA_ASSETS_REPOSITORY)
    private readonly repositorio: MediaAssetsRepository,
  ) {}

  /**
   * @returns `{ sucesso: false, erros }` se `originalFilename` estiver vazio
   * ou `mimeType` não começar com `"image/"` (a Apresentação traduz para
   * `422`); caso contrário, a credencial emitida (`mediaAssetId`,
   * `storagePath`, `signedUrl`, `token`).
   */
  async executar(input: EmitirCredencialUploadInput): Promise<ResultadoEmissaoCredencialUpload> {
    const validacao = validarSolicitacaoUpload(input);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    const credencial = await this.repositorio.emitirCredencialUpload(validacao.dado);
    return { sucesso: true, credencial };
  }
}
