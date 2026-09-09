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

export async function apiFetch<T>(
  caminho: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
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

  return (await resposta.json()) as T
}
