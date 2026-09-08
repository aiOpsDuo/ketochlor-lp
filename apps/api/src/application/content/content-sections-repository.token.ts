/**
 * Token de injeção do Nest para a porta `ContentSectionsRepository`
 * (Domínio). Mesmo motivo de existir do `VERIFICADOR_TOKEN`
 * (`presentation/auth/verificador-token.token.ts`): uma interface TypeScript
 * não existe em runtime, o Nest precisa de um valor para localizar o
 * provider correto na injeção de dependência.
 *
 * Definido na Aplicação (não na Apresentação, como `VERIFICADOR_TOKEN`)
 * porque é a Aplicação — os casos de uso deste módulo — quem declara a
 * dependência da porta via `@Inject`; a Apresentação (`content.module.ts`)
 * só liga a implementação concreta (`SupabaseContentSectionsRepository`,
 * Infraestrutura) a este token.
 */
export const CONTENT_SECTIONS_REPOSITORY = Symbol('ContentSectionsRepository');
