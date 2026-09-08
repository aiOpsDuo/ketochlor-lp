import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';
import type { ResultadoValidacao } from '../shared/resultado-validacao';
import { ChaveSecaoInvalidaError } from './chave-secao-invalida.error';

/**
 * Tipo do `data` já validado de uma seção `K`, inferido diretamente do
 * registro `CONTENT_SECTIONS` de `@ketochlor/content-schema` (a mesma forma
 * de `initialContent`) — evita duplicar os 11 tipos de seção aqui na API.
 */
type SectionDataOf<K extends SectionKey> = (typeof CONTENT_SECTIONS)[K]['initialContent'];

/**
 * `true` se `key` for um dos 11 identificadores fechados de seção do CMS.
 * Guarda de tipo — estreita `string` para `SectionKey`.
 */
export function ehChaveDeSecao(key: string): key is SectionKey {
  return Object.prototype.hasOwnProperty.call(CONTENT_SECTIONS, key);
}

/**
 * Valida o `data` bruto de uma seção contra o esquema Zod correspondente,
 * reaproveitando o registro exportado por `@ketochlor/content-schema`
 * (SDD § Camadas e padrão arquitetural — Domínio: "Esquemas de seção, regras
 * de validação de conteúdo... Sem nenhum import de framework ou de
 * Supabase"). Não decide o que acontece com o resultado — quem chama
 * (futuramente, o caso de uso de Aplicação `PUT /api/admin/sections/:key`)
 * decide se persiste ou recusa.
 *
 * @throws {ChaveSecaoInvalidaError} se `key` não for uma das 11 seções
 * fechadas — uma seção inexistente não é "dado inválido", é uma requisição
 * sem sentido, por isso não entra na lista de `erros` do resultado.
 */
export function validarConteudoSecao<K extends SectionKey>(
  key: K,
  data: unknown,
): ResultadoValidacao<SectionDataOf<K>>;
export function validarConteudoSecao(
  key: string,
  data: unknown,
): ResultadoValidacao<unknown>;
export function validarConteudoSecao(
  key: string,
  data: unknown,
): ResultadoValidacao<unknown> {
  if (!ehChaveDeSecao(key)) {
    throw new ChaveSecaoInvalidaError(key);
  }

  const { schema } = CONTENT_SECTIONS[key];
  const resultado = schema.safeParse(data);

  if (resultado.success) {
    return { sucesso: true, dado: resultado.data };
  }

  return {
    sucesso: false,
    erros: resultado.error.issues.map((issue) => ({
      campo: issue.path.length > 0 ? issue.path.join('.') : key,
      mensagem: issue.message,
    })),
  };
}
