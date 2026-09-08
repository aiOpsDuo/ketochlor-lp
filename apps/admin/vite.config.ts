import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Porta fixa (não a default do Vite) para o proxy de `apps/lp` sempre saber
// para onde encaminhar `/admin` em desenvolvimento — ver SDD § "Ponto único
// de entrada". `base` casa o prefixo de asset/HMR do dev server com o mesmo
// caminho `/admin` usado pelo proxy e pelo nginx em produção.
const ADMIN_DEV_PORT = 5174

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: ADMIN_DEV_PORT,
    strictPort: true,
  },
})
