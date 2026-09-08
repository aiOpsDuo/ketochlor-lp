import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Carrega apps/api/.env antes da suíte — só usado por dev/teste local
    // (ver apps/api/.env.example); configuração de produção real fica para
    // uma tarefa futura (SDD/PLAN.md), não faz parte desta.
    setupFiles: ['./vitest.setup.ts'],
  },
});
