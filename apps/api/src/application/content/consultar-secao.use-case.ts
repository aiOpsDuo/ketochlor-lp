import { Inject, Injectable } from '@nestjs/common';
import type { ContentSectionsRepository, SecaoPersistida } from '../../domain';
import { ChaveSecaoInvalidaError, ehChaveDeSecao } from '../../domain';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/**
 * Caso de uso de `GET /api/admin/sections/:key` (autenticado, tela de
 * edição): devolve o documento completo da seção — `data`, `itemVisibility`
 * e `isPublished` — incluindo itens não publicados (ao contrário de `GET
 * /api/content`, esta rota é para quem vai editar, não para o público).
 */
@Injectable()
export class ConsultarSecaoUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
  ) {}

  /**
   * @throws {ChaveSecaoInvalidaError} se `key` não é uma das 11 seções
   * fechadas — a Apresentação traduz para `404`.
   * @returns `null` se `key` é válida mas não existe nenhuma linha
   * persistida (anomalia de dados, as 11 seções são semeadas por migration)
   * — a Apresentação também traduz este caso para `404`.
   */
  async executar(key: string): Promise<SecaoPersistida | null> {
    if (!ehChaveDeSecao(key)) {
      throw new ChaveSecaoInvalidaError(key);
    }
    return this.repositorio.buscarPorChave(key);
  }
}
