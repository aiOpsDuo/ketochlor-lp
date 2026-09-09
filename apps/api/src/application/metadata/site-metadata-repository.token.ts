/**
 * Token de injeção do Nest para a porta `SiteMetadataRepository` (Domínio).
 * Mesmo motivo de existir do `CONTENT_SECTIONS_REPOSITORY`
 * (`application/content/content-sections-repository.token.ts`): uma
 * interface TypeScript não existe em runtime, o Nest precisa de um valor
 * para localizar o provider correto na injeção de dependência.
 *
 * Definido na Aplicação (não na Apresentação) pelo mesmo motivo do token de
 * conteúdo: é a Aplicação — os casos de uso deste módulo, e também
 * `ConsultarConteudoPublicadoUseCase` de `application/content` (`GET
 * /api/content` devolve `{ sections, metadata }`, SDD § Contratos de
 * dados/API/interfaces) — quem declara a dependência da porta via
 * `@Inject`; a Apresentação (`metadata.module.ts`) só liga a implementação
 * concreta (`SupabaseSiteMetadataRepository`, Infraestrutura) a este token.
 */
export const SITE_METADATA_REPOSITORY = Symbol('SiteMetadataRepository');
