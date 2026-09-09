import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'
import { LoadingScreen } from './loading-screen'

/**
 * Guarda a tela de login: com sessão já válida, não faz sentido ver o
 * formulário de novo — redireciona direto ao dashboard.
 */
export function PublicOnlyRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
