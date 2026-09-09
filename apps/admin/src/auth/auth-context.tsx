import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase-client'

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Fonte única de verdade sobre a sessão do operador, para todo o painel.
 * Lê a sessão persistida ao montar (`getSession`) e escuta login/logout/
 * renovação de token em tempo real (`onAuthStateChange`) — os dois já são o
 * mecanismo recomendado pelo SDK do Supabase para manter a UI em sincronia
 * com a sessão sem reinventar polling ou storage próprio.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessaoAtual) => {
      setSession(sessaoAtual)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.')
  }
  return context
}
