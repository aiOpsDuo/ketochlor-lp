/**
 * Token de injeção do Nest para a porta `OperadoresRepository` (Domínio).
 * Mesmo motivo de existir do `SITE_METADATA_REPOSITORY`
 * (`application/metadata/site-metadata-repository.token.ts`): uma interface
 * TypeScript não existe em runtime, o Nest precisa de um valor para localizar
 * o provider correto na injeção de dependência.
 */
export const OPERADORES_REPOSITORY = Symbol('OperadoresRepository');
