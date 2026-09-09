import { Inject, Injectable } from '@nestjs/common';
import type { SiteMetadataPersistido, SiteMetadataRepository } from '../../domain';
import { SITE_METADATA_REPOSITORY } from './site-metadata-repository.token';

/**
 * Caso de uso de `GET /api/admin/metadata` (autenticado, tela de edição de
 * metadados do painel): devolve o registro único de `site_metadata` como
 * está persistido — sem nenhuma regra de visibilidade a aplicar (diferente
 * de conteúdo de seção, não há conceito de "metadados não publicados").
 */
@Injectable()
export class ConsultarMetadataUseCase {
  constructor(
    @Inject(SITE_METADATA_REPOSITORY)
    private readonly repositorio: SiteMetadataRepository,
  ) {}

  async executar(): Promise<SiteMetadataPersistido> {
    return this.repositorio.buscar();
  }
}
