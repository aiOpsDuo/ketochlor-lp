import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/auth-context'
import { ProtectedRoute } from './auth/protected-route'
import { PublicOnlyRoute } from './auth/public-only-route'
import { AdminLayout } from './layout/admin-layout'
import { LoginPage } from './pages/login-page'
import { MetadataPage } from './pages/metadata/metadata-page'
import { SectionDetailPage } from './pages/sections/section-detail-page'
import { SectionListPage } from './pages/sections/section-list-page'

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
            {/* `AdminLayout` (cabeçalho + navegação + sair) é o pai de toda
                rota autenticada — `painel/tela-metadados` e
                `painel/tela-leads` só precisam adicionar um `<Route
                path="metadata" .../>`/`<Route path="leads" .../>` aqui,
                sem tocar em `AdminLayout` (o link de nav já existe lá). */}
            <Route element={<AdminLayout />}>
              <Route index element={<SectionListPage />} />
              <Route path="sections/:key" element={<SectionDetailPage />} />
              <Route path="metadata" element={<MetadataPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
