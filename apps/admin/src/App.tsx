import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/auth-context'
import { ProtectedRoute } from './auth/protected-route'
import { PublicOnlyRoute } from './auth/public-only-route'
import { DashboardPage } from './pages/dashboard-page'
import { LoginPage } from './pages/login-page'

export default function App() {
  // `basename="/admin"` casa com `base: '/admin/'` de vite.config.ts (SDD §
  // "Ponto único de entrada"): a rota `/login` do React Router já resolve
  // para a URL real `/admin/login`, sem duplicar o prefixo.
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
