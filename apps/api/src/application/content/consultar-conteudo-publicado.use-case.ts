import { Inject, Injectable } from '@nestjs/common';
import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';
import {
  filtrarConteudoPublicado,
  type ContentSectionsRepository,
  type SiteMetadataPersistido,
  type SiteMetadataRepository,
} from '../../domain';
import { SITE_METADATA_REPOSITORY } from '../metadata/site-metadata-repository.token';
import { CONTENT_SECTIONS_REPOSITORY } from './content-sections-repository.token';

/**
 * Formato de resposta de `GET /api/content` (SDD § Contratos de dados/API/
 * interfaces — "Conteúdo público": `{ sections, metadata }`).
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
 *
 * `metadata` (tarefa `api/modulo-metadata`) não tem conceito de visibilidade
 * — é sempre o registro único de `site_metadata` tal como persistido, sem
 * filtro (diferente de `sections`, que passa por `filtrarConteudoPublicado`).
 */
export interface ConteudoPublicado {
  sections: Record<SectionKey, Record<string, unknown> | null>;
  metadata: SiteMetadataPersistido;
}

/**
 * Caso de uso de `GET /api/content` (SDD § Contratos de dados/API/interfaces
 * — rota pública, sem autenticação). Busca as 11 seções numa única consulta
 * (`buscarTodas`, evita N+1 — SDD § Riscos técnicos) e usa
 * `filtrarConteudoPublicado` (Domínio) para nunca vazar seção ou item de
 * lista não publicado.
 *
 * **Decisão de design (tarefa `api/modulo-metadata`): estende este caso de
 * uso já existente, em vez de criar um caso de uso novo que compõe este e um
 * `ConsultarMetadataUseCase`.** A rota `GET /api/content` já é, desde
 * `api/modulo-content`, "1 rota pública = 1 caso de uso" — o mesmo padrão de
 * todas as demais rotas deste código (`ListarSecoesUseCase`,
 * `ConsultarSecaoUseCase` etc.). Compor dois casos de uso aqui só para manter
 * uma separação teórica adicionaria uma camada de indireção sem consumidor
 * real (nenhuma outra rota precisa de "sections sem metadata" ou vice-versa)
 * — over-engineering pela régua de proporcionalidade do porte Médio deste
 * projeto (`agent_context/SDD.md` § Porte do projeto). O ganho de SRP seria
 * nominal: este método continua fazendo uma coisa só, "montar a resposta de
 * `GET /api/content`", buscando as duas fontes em paralelo.
 */
@Injectable()
export class ConsultarConteudoPublicadoUseCase {
  constructor(
    @Inject(CONTENT_SECTIONS_REPOSITORY)
    private readonly repositorio: ContentSectionsRepository,
    @Inject(SITE_METADATA_REPOSITORY)
    private readonly metadataRepositorio: SiteMetadataRepository,
  ) {}

  async executar(): Promise<ConteudoPublicado> {
    const [secoesPersistidas, metadata] = await Promise.all([
      this.repositorio.buscarTodas(),
      this.metadataRepositorio.buscar(),
    ]);
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

    return { sections, metadata };
  }
}
