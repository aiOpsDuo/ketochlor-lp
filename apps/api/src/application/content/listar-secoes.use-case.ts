import { Inject, Injectable } from '@nestjs/common';
import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';
import type { ContentSectionsRepository } from '../../domain';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/**
 * Resumo de uma seção para a tela de LISTAGEM do painel (`GET
 * /api/admin/sections`) — não é a mesma forma de `SecaoPersistida`
 * (Domínio): omite `data`/`itemVisibility` de propósito, porque a listagem
 * não precisa do documento completo (SDD § Contratos de dados/API/interfaces
 * — "lista das 11 seções com estado atual, para a tela de listagem").
 */
export interface SecaoResumo {
  key: SectionKey;
  isPublished: boolean;
  updatedAt: string;
}

/**
 * Caso de uso de `GET /api/admin/sections` (autenticado). A ordem do array
 * devolvido é a ordem de declaração de `CONTENT_SECTIONS` em
 * `@ketochlor/content-schema` — não a ordem (arbitrária) de retorno do banco
 * — porque o SDD (§ Critérios de aceitação — "Painel de edição por seção")
 * exige "as 11 seções... na mesma ordem da LP".
 */
@Injectable()
export class ListarSecoesUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
  ) {}

  async executar(): Promise<SecaoResumo[]> {
    const secoesPersistidas = await this.repositorio.buscarTodas();
    const porChave = new Map(secoesPersistidas.map((secao) => [secao.key, secao]));

    const chavesOrdenadas = Object.keys(CONTENT_SECTIONS) as SectionKey[];
    const resumos: SecaoResumo[] = [];
    for (const key of chavesOrdenadas) {
      const secao = porChave.get(key);
      // Sem linha persistida para uma das 11 chaves é uma anomalia de dados
      // (ver mesmo comentário em `ConsultarConteudoPublicadoUseCase`) — aqui
      // a seção simplesmente não aparece na listagem, em vez de quebrar a
      // tela inteira do painel por uma linha faltante.
      if (secao) {
        resumos.push({ key: secao.key, isPublished: secao.isPublished, updatedAt: secao.updatedAt });
      }
    }
    return resumos;
  }
}
