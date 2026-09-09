import type { ItemVisibilityMap } from '../../domain';

/**
 * Corpo de `PUT /api/admin/sections/:key`. Sem decorators de validação
 * (`class-validator`/`class-transformer` não são dependências deste projeto,
 * ver `apps/api/package.json`) — de propósito: a validação de `data` é a
 * validação de negócio contra o esquema Zod da seção
 * (`validarConteudoSecao`, Domínio), não uma checagem de forma de DTO
 * genérica. Este tipo só documenta o contrato HTTP para o controller e para
 * quem chama a API.
 */
export interface AtualizarSecaoDto {
  data: unknown;
  itemVisibility?: ItemVisibilityMap;
}
