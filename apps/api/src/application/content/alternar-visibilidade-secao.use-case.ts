import { Inject, Injectable } from '@nestjs/common';
import type { ContentSectionsRepository, SecaoPersistida } from '../../domain';
import { ChaveSecaoInvalidaError, ehChaveDeSecao } from '../../domain';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/**
 * Caso de uso de `PATCH /api/admin/sections/:key/visibility` (autenticado):
 * inverte `isPublished` da seção inteira.
 *
 * Verifica a existência da seção ANTES de chamar
 * `ContentSectionsRepository.alternarPublicacao` (em vez de deixar a
 * Infraestrutura lançar seu `Error` genérico de "seção não encontrada") para
 * poder distinguir, na Apresentação, "seção inexistente" (`404`) de uma
 * falha de infraestrutura de verdade — um `catch` genérico do `Error` da
 * infra arriscaria confundir os dois casos.
 */
@Injectable()
export class AlternarVisibilidadeSecaoUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
  ) {}

  /**
   * @throws {ChaveSecaoInvalidaError} se `key` não é uma das 11 seções
   * fechadas — a Apresentação traduz para `404`.
   * @returns `null` se `key` é válida mas não existe linha persistida
   * (anomalia de dados) — a Apresentação também traduz para `404`; caso
   * contrário, a seção com `isPublished` invertido.
   */
  async executar(key: string, updatedBy: string | null): Promise<SecaoPersistida | null> {
    if (!ehChaveDeSecao(key)) {
      throw new ChaveSecaoInvalidaError(key);
    }
    const atual = await this.repositorio.buscarPorChave(key);
    if (!atual) {
      return null;
    }
    return this.repositorio.alternarPublicacao(key, updatedBy);
  }
}
