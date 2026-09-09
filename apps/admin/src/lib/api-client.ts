/**
 * Cliente HTTP mínimo para as rotas autenticadas de `/api/admin/*` (ver
 * `docs/API.md`). Caminho relativo de propósito: tanto o dev server (proxy
 * de `apps/lp/vite.config.ts`) quanto o nginx de produção
 * (`docker/nginx.conf`) servem o painel e a API sob o mesmo domínio —
 * nenhuma URL absoluta precisa ser montada aqui, nem uma variável de
 * ambiente própria para o endereço da API.
 *
 * Genérico o suficiente para as próximas telas autenticadas do painel
 * (`painel/tela-metadados`, `painel/tela-leads`) reaproveitarem sem
 * reimplementar o cabeçalho `Authorization`/tratamento de erro.
 */
/** Item de `erros` no formato uniforme de erro de validação (`docs/API.md` § "Formato de erro uniforme"). */
export interface ErroValidacaoCampo {
  campo: string
  mensagem: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    // Presente só quando a API responde `422` com a extensão `erros` do
    // formato uniforme (ex.: `PUT /api/admin/metadata`, `PUT
    // /api/admin/sections/:key`) — `null` em qualquer outro erro (401, 404,
    // 500, ...), onde `message` já é a informação completa.
    readonly erros: ErroValidacaoCampo[] | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// `DELETE /api/admin/leads/:id` (docs/API.md) devolve `204 No Content` em
// sucesso — sem corpo. Nomeado em vez de comparar contra `204` cru (G25).
const HTTP_STATUS_SEM_CONTEUDO = 204

/**
 * Núcleo comum a `apiFetch`/`apiFetchTexto`: monta o cabeçalho
 * `Authorization` e traduz qualquer resposta não-2xx num `ApiError` com a
 * mensagem do corpo de erro uniforme da API (`docs/API.md`). Extraído para
 * as duas variantes (JSON e texto puro, esta segunda adicionada por
 * `painel/tela-leads` para o CSV de `GET /api/admin/leads/export.csv`, que
 * não é JSON) não duplicarem o mesmo tratamento de cabeçalho/erro (G5).
 */
async function requisicaoAutenticada(
  caminho: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  const resposta = await fetch(caminho, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null)
    const mensagem =
      typeof corpo?.message === 'string' ? corpo.message : `Erro ${resposta.status} ao chamar ${caminho}.`
    const erros = Array.isArray(corpo?.erros) ? corpo.erros : null
    throw new ApiError(mensagem, resposta.status, erros)
  }

  return resposta
}

export async function apiFetch<T>(
  caminho: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const resposta = await requisicaoAutenticada(caminho, accessToken, init)
  if (resposta.status === HTTP_STATUS_SEM_CONTEUDO) {
    return undefined as T
  }
  return (await resposta.json()) as T
}

/**
 * Variante de `apiFetch` para respostas que não são JSON (hoje, só o CSV de
 * `GET /api/admin/leads/export.csv`, `text/csv`). O navegador não permite
 * anexar um cabeçalho `Authorization` customizado a um link/âncora simples
 * — por isso o painel busca o texto aqui (já autenticado) e monta o
 * download no cliente com `Blob`/`URL.createObjectURL` (ver
 * `pages/leads/leads-page.tsx`).
 */
export async function apiFetchTexto(
  caminho: string,
  accessToken: string,
  init?: RequestInit,
): Promise<string> {
  const resposta = await requisicaoAutenticada(caminho, accessToken, init)
  return resposta.text()
}
