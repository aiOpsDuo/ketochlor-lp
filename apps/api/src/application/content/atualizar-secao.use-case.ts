import { Inject, Injectable } from '@nestjs/common';
import type { SectionKey } from '@ketochlor/content-schema';
import type {
  ContentSectionsRepository,
  ErroValidacaoCampo,
  ItemVisibilityMap,
  SecaoPersistida,
} from '../../domain';
import { validarConteudoSecao } from '../../domain';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/** Corpo de `PUT /api/admin/sections/:key` (SDD § Contratos de dados/API/interfaces). */
export interface AtualizarSecaoInput {
  data: unknown;
  /** Omitido: preserva o `itemVisibility` já persistido (ver comentário em `executar`). */
  itemVisibility?: ItemVisibilityMap;
}

export type ResultadoAtualizacaoSecao =
  | { sucesso: true; secao: SecaoPersistida }
  | { sucesso: false; erros: ErroValidacaoCampo[] };

/**
 * Caso de uso de `PUT /api/admin/sections/:key` (autenticado). Nenhuma regra
 * de negócio aqui além de orquestrar: valida `data` contra o esquema da
 * seção via `validarConteudoSecao` (Domínio) ANTES de persistir — o
 * controller nunca chama o repositório diretamente.
 */
@Injectable()
export class AtualizarSecaoUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
  ) {}

  /**
   * @throws {ChaveSecaoInvalidaError} se `key` não é uma das 11 seções
   * fechadas (lançado por `validarConteudoSecao`) — a Apresentação traduz
   * para `404`.
   * @returns `{ sucesso: false, erros }` se `data` não bate com o esquema da
   * seção (a Apresentação traduz para `422`); `null` se `key` é válida mas
   * não existe linha persistida (anomalia de dados) — a Apresentação também
   * traduz este caso para `404`; caso contrário, a seção persistida.
   */
  async executar(
    key: string,
    input: AtualizarSecaoInput,
    updatedBy: string | null,
  ): Promise<ResultadoAtualizacaoSecao | null> {
    const validacao = validarConteudoSecao(key, input.data);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    // `validarConteudoSecao` não lançou `ChaveSecaoInvalidaError` acima, logo
    // `key` é garantidamente uma das 11 chaves fechadas — seguro estreitar
    // aqui para chamar o repositório (que exige `SectionKey`, não `string`).
    const secaoKey = key as SectionKey;
    const secaoAtual = await this.repositorio.buscarPorChave(secaoKey);
    if (!secaoAtual) {
      return null;
    }

    // `itemVisibility` é opcional no corpo (SDD): quando omitido, preserva o
    // mapa já persistido em vez de zerá-lo — um salvamento que só mexe em
    // texto não pode reverter itens já ocultados por um salvamento anterior
    // (ver `PLAN.md`, nota de design sobre `ItemVisibilityMap` ser escrito
    // atomicamente junto de `data`, nunca perdido por engano).
    const itemVisibility = input.itemVisibility ?? secaoAtual.itemVisibility;

    const secao = await this.repositorio.atualizarConteudo(
      secaoKey,
      validacao.dado as Record<string, unknown>,
      itemVisibility,
      updatedBy,
    );
    return { sucesso: true, secao };
  }
}
