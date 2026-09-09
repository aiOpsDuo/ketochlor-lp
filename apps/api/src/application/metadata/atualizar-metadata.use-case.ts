import { Inject, Injectable } from '@nestjs/common';
import type {
  ErroValidacaoCampo,
  SiteMetadataPersistido,
  SiteMetadataRepository,
} from '../../domain';
import { validarSiteMetadata } from '../../domain';
import { SITE_METADATA_REPOSITORY } from './site-metadata-repository.token';

/** Corpo de `PUT /api/admin/metadata` (SDD § Contratos de dados/API/interfaces). */
export interface AtualizarMetadataInput {
  title: string;
  description: string;
  ogImageMediaId: string | null;
}

export type ResultadoAtualizacaoMetadata =
  | { sucesso: true; metadata: SiteMetadataPersistido }
  | { sucesso: false; erros: ErroValidacaoCampo[] };

/**
 * Caso de uso de `PUT /api/admin/metadata` (autenticado). Nenhuma regra de
 * negócio aqui além de orquestrar: valida o corpo via `validarSiteMetadata`
 * (Domínio) ANTES de persistir — o controller nunca chama o repositório
 * diretamente, mesmo padrão de `AtualizarSecaoUseCase`.
 */
@Injectable()
export class AtualizarMetadataUseCase {
  constructor(
    @Inject(SITE_METADATA_REPOSITORY)
    private readonly repositorio: SiteMetadataRepository,
  ) {}

  /**
   * @returns `{ sucesso: false, erros }` se `title`/`description` estiverem
   * vazios ou `ogImageMediaId` não for texto nem nulo (a Apresentação
   * traduz para `422`); caso contrário, o registro atualizado.
   */
  async executar(
    input: AtualizarMetadataInput,
    updatedBy: string | null,
  ): Promise<ResultadoAtualizacaoMetadata> {
    const validacao = validarSiteMetadata(input);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    const metadata = await this.repositorio.atualizar({ ...validacao.dado, updatedBy });
    return { sucesso: true, metadata };
  }
}
