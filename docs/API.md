# API (`apps/api`)

NestJS 11, camadas Apresentação → Aplicação → Domínio → Infraestrutura (ver [`agent_context/SDD.md` § "Camadas e padrão arquitetural"](../agent_context/SDD.md)). Este documento cobre, por ora, só a configuração necessária para rodar a API e seus testes de integração — rotas e autenticação são documentadas aqui conforme as tarefas `api/modulo-auth`, `api/modulo-content` etc. do [`agent_context/PLAN.md`](../agent_context/PLAN.md) forem concluídas.

## Configuração

Variáveis de ambiente lidas de `process.env` (`apps/api/src/infrastructure/config/supabase-env.ts`), nunca hardcoded. Copie `apps/api/.env.example` para `apps/api/.env` (arquivo local, ignorado pelo Git) e ajuste:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | sim | URL da API do projeto Supabase (local: `http://127.0.0.1:54321`, ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)). |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave `service_role` — ignora Row Level Security. Usada só pela Infraestrutura da API; nunca exposta a LP/painel. |
| `SUPABASE_JWKS_URL` | uma das duas (esta ou `SUPABASE_JWT_SECRET`) | URL do JWKS do projeto, para verificar tokens assinados com chave assimétrica (`ES256`/`RS256`). Instâncias locais atuais do Supabase CLI já emitem chaves assimétricas por padrão — é o caminho que de fato valida uma sessão local, em `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`. |
| `SUPABASE_JWT_SECRET` | uma das duas (esta ou `SUPABASE_JWKS_URL`) | Segredo HS256 legado do projeto (`GOTRUE_JWT_SECRET`), para verificar tokens de projetos/instâncias mais antigas que ainda não migraram para chaves assimétricas. |
| `SUPABASE_STORAGE_BUCKET` | não (default `images`) | Bucket de Storage das imagens do CMS. |

O verificador de token (`apps/api/src/infrastructure/auth/jwks-token-verificador.ts`) é híbrido: lê o algoritmo (`alg`) de cada JWT recebido e escolhe a estratégia certa — `SUPABASE_JWT_SECRET` para tokens `HS*`, `SUPABASE_JWKS_URL` para qualquer outro algoritmo. Configurar as duas variáveis ao mesmo tempo é seguro e é o que os testes de integração fazem.

Os valores em `apps/api/.env.example` já vêm preenchidos com os defaults **públicos e conhecidos** de qualquer instância local do Supabase CLI (mesmos documentados em [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)) — não são segredo real, servem só para desenvolvimento e para os testes de integração rodarem contra `npx supabase start` local. Um ambiente de produção real usa um projeto Supabase próprio, com sua própria `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_JWKS_URL` — carregar essas variáveis em produção (Docker/compose) é responsabilidade de uma tarefa futura do plano, não desta configuração de desenvolvimento.

## Testes de integração

Os testes de `apps/api/src/infrastructure` (`npm run test --prefix apps/api -- infra`) rodam contra o Supabase LOCAL de verdade, não mocks do SDK:

```bash
npx supabase start   # sobe Postgres/Auth/Storage locais
npm run test --prefix apps/api -- infra
npx supabase stop    # não deixe os containers rodando ao final
```

`apps/api/vitest.setup.ts` carrega `apps/api/.env` (via `dotenv`) antes da suíte — só para desenvolvimento/teste local, nunca usado pelo `apps/api/src/main.ts` em produção.
