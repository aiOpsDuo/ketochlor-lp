import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'
import { LoadingScreen } from './loading-screen'

/**
 * Guarda qualquer rota sob `/admin` que exija sessão (PRD § Requerimentos
 * sistêmicos — "nenhuma tela sob /admin é alcançável sem sessão válida").
 * Sem sessão, redireciona ao login; a checagem real de autorização de cada
 * chamada continua sendo feita pela API (`AuthGuard`), este componente só
 * evita expor a UI sem sessão local.
 */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
