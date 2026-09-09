/**
 * Token de injeção do Nest para a porta `MediaAssetsRepository` (Domínio).
 * Mesmo motivo de existir do `CONTENT_SECTIONS_REPOSITORY`/
 * `SITE_METADATA_REPOSITORY`: uma interface TypeScript não existe em
 * runtime, o Nest precisa de um valor para localizar o provider correto na
 * injeção de dependência.
 *
 * Definido na Aplicação (não na Apresentação) pelo mesmo motivo dos outros
 * tokens: é a Aplicação — `EmitirCredencialUploadUseCase` — quem declara a
 * dependência da porta via `@Inject`; a Apresentação (`media.module.ts`) só
 * liga a implementação concreta (`SupabaseMediaAssetsRepository`,
 * Infraestrutura) a este token.
 */
export const MEDIA_ASSETS_REPOSITORY = Symbol('MediaAssetsRepository');
