import { Module, type Provider } from '@nestjs/common';
import { AlternarVisibilidadeSecaoUseCase } from '../../application/content/alternar-visibilidade-secao.use-case';
import { AtualizarSecaoUseCase } from '../../application/content/atualizar-secao.use-case';
import { CONTENT_SECTIONS_REPOSITORY } from '../../application/content/content-sections-repository.token';
import { ConsultarConteudoPublicadoUseCase } from '../../application/content/consultar-conteudo-publicado.use-case';
import { ConsultarSecaoUseCase } from '../../application/content/consultar-secao.use-case';
import { ListarSecoesUseCase } from '../../application/content/listar-secoes.use-case';
import {
  carregarSupabaseEnv,
  criarSupabaseAdminClient,
  SupabaseContentSectionsRepository,
} from '../../infrastructure';
import { ContentAdminController } from './content-admin.controller';
import { ContentPublicController } from './content-public.controller';

/**
 * Liga a porta `ContentSectionsRepository` (Domínio) à implementação
 * concreta `SupabaseContentSectionsRepository` (Infraestrutura) — mesmo
 * padrão de `presentation/auth/auth.module.ts` para `VERIFICADOR_TOKEN`: este
 * é o único ponto do código que decide QUAL implementação satisfaz a porta.
 */
const contentSectionsRepositoryProvider: Provider = {
  provide: CONTENT_SECTIONS_REPOSITORY,
  useFactory: () => {
    const env = carregarSupabaseEnv();
    const client = criarSupabaseAdminClient(env);
    return new SupabaseContentSectionsRepository(client);
  },
};

/**
 * Módulo de conteúdo (tarefa `api/modulo-content`): `GET /api/content`
 * (público) + CRUD administrativo de seções sob `/api/admin/sections`
 * (protegido pelo `AuthGuard` global de `AuthModule`, sem precisar
 * importá-lo aqui — o guard é global via `APP_GUARD`, não escopado a módulo).
 */
@Module({
  controllers: [ContentPublicController, ContentAdminController],
  providers: [
    contentSectionsRepositoryProvider,
    ConsultarConteudoPublicadoUseCase,
    ListarSecoesUseCase,
    ConsultarSecaoUseCase,
    AtualizarSecaoUseCase,
    AlternarVisibilidadeSecaoUseCase,
  ],
})
export class ContentModule {}
