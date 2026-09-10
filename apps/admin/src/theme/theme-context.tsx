import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

/**
 * Chave de `localStorage` da preferência de tema — prefixo `ketochlor.painel.`
 * para casar com o padrão já usado por `CHAVE_SIDEBAR_RECOLHIDA`
 * (`layout/admin-layout.tsx`), a outra preferência de UI persistida do
 * painel.
 */
const CHAVE_TEMA = 'ketochlor.painel.tema'

interface ThemeContextValue {
  readonly theme: Theme
  readonly toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Preferência de tema do SISTEMA OPERACIONAL — só usada quando o operador
 * nunca escolheu nada (`lerTemaSalvo` devolve `null`). Lido em `try/catch`
 * pelo mesmo motivo de qualquer outro acessador do navegador neste painel
 * (`admin-layout.tsx`): pode lançar em ambientes restritos, e nesse caso o
 * painel simplesmente abre no tema claro, que é o padrão.
 */
function prefereTemaEscuroDoSistema(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function lerTemaSalvo(): Theme | null {
  try {
    const salvo = window.localStorage.getItem(CHAVE_TEMA)
    return salvo === 'light' || salvo === 'dark' ? salvo : null
  } catch {
    return null
  }
}

function gravarTemaSalvo(tema: Theme): void {
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema)
  } catch {
    // Preferência visual: se o navegador não deixa persistir, seguir sem ela.
  }
}

/** Tema inicial: a escolha salva do operador, ou a preferência do sistema quando não há nenhuma escolha salva ainda. */
function temaInicial(): Theme {
  return lerTemaSalvo() ?? (prefereTemaEscuroDoSistema() ? 'dark' : 'light')
}

/**
 * Alternador de tema claro/escuro do painel (correção da tarefa
 * `ajustes/tema-escuro-logo-e-campo-de-imagem`: a tarefa anterior
 * `ajustes/estiliza-painel-admin` decidiu não implementar tema escuro por o
 * painel "não ter alternador" — decisão revertida aqui a pedido do usuário).
 *
 * A classe `dark` é aplicada em `<html>` (`document.documentElement`), o
 * gatilho que `darkMode: 'class'` (`tailwind.config.ts`) espera para ativar
 * toda variante `dark:` do painel — é assim, e não por um contexto de React
 * lido em cada componente, que a MESMA classe utilitária Tailwind já escrita
 * em cada tela responde à mudança de tema sem nenhum componente precisar
 * saber que o tema existe.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(temaInicial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    gravarTemaSalvo(theme)
  }, [theme])

  function toggleTheme(): void {
    setTheme((atual) => (atual === 'dark' ? 'light' : 'dark'))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>.')
  }
  return context
}
