import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Ponto único de entrada em desenvolvimento (SDD § "Camadas e padrão
// arquitetural" → "Ponto único de entrada"): o dev server da LP é o
// endereço único (http://localhost:5173) e encaminha /admin e /api para os
// processos de apps/admin e apps/api via proxy de desenvolvimento.
const API_DEV_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000'
const ADMIN_DEV_TARGET = 'http://localhost:5174'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_DEV_TARGET,
        changeOrigin: true,
      },
      // `ws: true` também encaminha o upgrade da conexão de HMR do Vite do
      // painel — o dev server de apps/admin usa `base: '/admin/'`, então
      // tanto os assets quanto o socket de HMR já chegam prefixados com
      // `/admin`, sem precisar de `rewrite`. A única normalização necessária
      // é `/admin` (sem barra final, o endereço que um usuário de fato
      // digita/navega) para `/admin/` — sem ela o dev server do painel
      // devolve 404 (ele só serve o `index.html` exatamente em `base`).
      '/admin': {
        target: ADMIN_DEV_TARGET,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => (path === '/admin' ? '/admin/' : path),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
