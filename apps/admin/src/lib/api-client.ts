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
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
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
    throw new ApiError(mensagem, resposta.status)
  }

  return (await resposta.json()) as T
}
