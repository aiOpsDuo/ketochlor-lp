/**
 * Token de injeção do Nest para a porta `LeadsRepository` (Domínio). Mesmo
 * motivo de existir dos demais tokens (`CONTENT_SECTIONS_REPOSITORY`,
 * `SITE_METADATA_REPOSITORY`, `MEDIA_ASSETS_REPOSITORY`): uma interface
 * TypeScript não existe em runtime, o Nest precisa de um valor para localizar
 * o provider correto na injeção de dependência.
 *
 * Definido na Aplicação (não na Apresentação) pelo mesmo motivo dos outros
 * tokens: é a Aplicação — os casos de uso deste módulo (`RegistrarLeadUseCase`,
 * `ListarLeadsUseCase`, `ExcluirLeadUseCase`) — quem declara a dependência da
 * porta via `@Inject`; a Apresentação (`leads.module.ts`) só liga a
 * implementação concreta (`SupabaseLeadsRepository`, Infraestrutura) a este
 * token.
 */
export const LEADS_REPOSITORY = Symbol('LeadsRepository');
