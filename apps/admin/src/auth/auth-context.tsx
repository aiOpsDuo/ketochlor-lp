import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../lib/api-client'

const CHAVE_TOKEN = 'ketochlor.painel.access-token'

/**
 * Sessão local do operador autenticado. Guarda o JWT emitido por `POST
 * /api/auth/login` (`accessToken`) e o `operatorId`/`email` decodificados
 * do próprio token — nunca uma sessão de servidor (SDD § "Migração de
 * plataforma de dados" → Painel: sem nenhum intermediário de terceiro, o
 * painel gerencia a própria sessão).
 */
export interface SessaoOperador {
  accessToken: string
  operatorId: string
  email: string
}

interface AuthContextValue {
  session: SessaoOperador | null
  isLoading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Formato mínimo do payload (segundo segmento) do JWT emitido por `POST /api/auth/login` — `sub` é `operators.id` (SDD § Modelo de dados → `operators`). */
interface PayloadTokenJwt {
  sub: string
  email: string
}

/**
 * Decodifica o payload de um JWT compacto (`header.payload.assinatura`),
 * SEM verificar assinatura — decisão deliberada desta tarefa
 * (`ajustes/migracao-mysql-painel-auth-e-upload`): o único uso deste valor
 * no painel é exibir `email`/`operatorId` na UI (cabeçalho de
 * `AdminLayout`, tela de Operadores); a validação de verdade de todo token
 * continua sendo feita pela API (`AuthGuard`/`AppJwtTokenVerificador`) a
 * cada requisição a `/api/admin/*` — um payload adulterado no cliente nunca
 * passaria por lá, então verificar a assinatura aqui não agregaria
 * segurança nenhuma, só complexidade (nenhuma biblioteca de JWT no
 * navegador, WebCrypto manual para nada).
 *
 * Base64URL (`-`/`_` no lugar de `+`/`/`) decodificado com `atob` do
 * próprio navegador; o `decodeURIComponent`/`escape` percentual trata
 * caracteres multibyte do e-mail corretamente (`atob` sozinho devolve
 * Latin1 puro).
 */
function decodificarPayload(token: string): PayloadTokenJwt {
  const [, payloadBase64Url] = token.split('.')
  if (!payloadBase64Url) {
    throw new Error('Token JWT com formato inesperado.')
  }

  const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPercentEscapado = atob(payloadBase64)
    .split('')
    .map((caractere) => '%' + caractere.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')

  return JSON.parse(decodeURIComponent(jsonPercentEscapado)) as PayloadTokenJwt
}

function paraSessao(accessToken: string): SessaoOperador {
  const payload = decodificarPayload(accessToken)
  return { accessToken, operatorId: payload.sub, email: payload.email }
}

/**
 * Leitura/escrita do token em `localStorage` — não há refresh token nem
 * renovação automática nesta primeira versão (SDD § "Migração de
 * plataforma de dados" → Painel; PRD descreve o painel como ferramenta
 * interna de uso ocasional), então o token persiste como está até expirar
 * ou até logout manual. Acessador em `try/catch` porque pode lançar (janela
 * privada, cookies de site bloqueados) — nesse caso o painel simplesmente
 * não mantém sessão entre recarregamentos, mesmo padrão já usado por
 * `admin-layout.tsx` para a preferência de sidebar recolhida.
 */
function lerTokenPersistido(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

function gravarTokenPersistido(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(CHAVE_TOKEN, token)
    } else {
      window.localStorage.removeItem(CHAVE_TOKEN)
    }
  } catch {
    // Sem persistência entre recarregamentos se o navegador bloquear
    // localStorage — o painel continua funcionável na aba atual.
  }
}

/**
 * Fonte única de verdade sobre a sessão do operador, para todo o painel
 * (SDD § "Migração de plataforma de dados" → Painel). Ao montar, tenta
 * restaurar a sessão a partir do token persistido em `localStorage`; `login`
 * chama `POST /api/auth/login` diretamente via `fetch` (sem SDK cliente,
 * mesmo padrão do restante do painel — `lib/api-client.ts`) e guarda o
 * `accessToken` devolvido; `logout` só apaga o token local — não há sessão
 * de servidor para invalidar (limitação inerente a um JWT stateless).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessaoOperador | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const tokenPersistido = lerTokenPersistido()
    if (tokenPersistido) {
      try {
        setSession(paraSessao(tokenPersistido))
      } catch {
        // Token persistido corrompido/ilegível: descarta em vez de manter
        // o painel preso a um estado que nunca vai autenticar de verdade
        // contra a API (que rejeitaria o mesmo token com 401).
        gravarTokenPersistido(null)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null)
      const mensagem =
        typeof corpo?.message === 'string' ? corpo.message : 'Não foi possível entrar.'
      throw new ApiError(mensagem, resposta.status)
    }

    const { accessToken } = (await resposta.json()) as { accessToken: string }
    gravarTokenPersistido(accessToken)
    setSession(paraSessao(accessToken))
  }, [])

  const logout = useCallback(() => {
    gravarTokenPersistido(null)
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, isLoading, login, logout }),
    [session, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.')
  }
  return context
}
