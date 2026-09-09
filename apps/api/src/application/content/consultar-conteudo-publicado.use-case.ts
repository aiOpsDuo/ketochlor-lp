import { Inject, Injectable } from '@nestjs/common';
import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';
import {
  filtrarConteudoPublicado,
  type ContentSectionsRepository,
} from '../../domain';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/**
 * Formato de resposta de `GET /api/content` (SDD § Contratos de dados/API/
 * interfaces — "Conteúdo público"). `metadata` (de `site_metadata`) chega
 * numa tarefa futura (`api/modulo-metadata`) — por isso o tipo aqui cobre só
 * `sections`, não a forma completa `{ sections, metadata }` do SDD.
 *
 * Decisão de formato (tarefa `api/modulo-content`): as 11 chaves de
 * `sections` estão SEMPRE presentes na resposta — uma seção com
 * `is_published = false` aparece com valor `null`, nunca é omitida. Chave
 * omitida e chave com `null` são indistinguíveis para a maioria dos clientes
 * JSON só de olhar `Object.keys`, mas `null` deixa explícito "esta seção
 * existe no CMS mas não está publicada" e permite ao consumidor (a LP, via
 * `PublishedContentProvider` de `lp/provider-conteudo-publicado`) iterar as
 * 11 chaves conhecidas de `@ketochlor/content-schema` sem precisar checar
 * presença de cada uma primeiro — sempre `sections[key]`, nunca
 * `key in sections`.
 */
export interface ConteudoPublicado {
  sections: Record<SectionKey, Record<string, unknown> | null>;
}

/**
 * Caso de uso de `GET /api/content` (SDD § Contratos de dados/API/interfaces
 * — rota pública, sem autenticação). Busca as 11 seções numa única consulta
 * (`buscarTodas`, evita N+1 — SDD § Riscos técnicos) e usa
 * `filtrarConteudoPublicado` (Domínio) para nunca vazar seção ou item de
 * lista não publicado.
 */
@Injectable()
export class ConsultarConteudoPublicadoUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
  ) {}

  async executar(): Promise<ConteudoPublicado> {
    const secoesPersistidas = await this.repositorio.buscarTodas();
    const porChave = new Map(secoesPersistidas.map((secao) => [secao.key, secao]));

    const sections = {} as Record<SectionKey, Record<string, unknown> | null>;
    for (const key of Object.keys(CONTENT_SECTIONS) as SectionKey[]) {
      const secao = porChave.get(key);
      // Sem linha persistida para uma das 11 chaves fechadas seria uma
      // anomalia de dados (as 11 são semeadas por migration) — tratada aqui
      // como "não publicada" (null), nunca como erro: `GET /api/content` é
      // pública e não deve derrubar a LP por uma inconsistência de dados.
      sections[key] = secao
        ? filtrarConteudoPublicado(secao, secao.itemVisibility)
        : null;
    }

    return { sections };
  }
}
