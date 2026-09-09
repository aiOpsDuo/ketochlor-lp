# Painel (`apps/admin`)

React 18 + Vite 5 + TypeScript 5, servido sob `/admin` no mesmo domínio da LP (ver [`agent_context/SDD.md` § "Ponto único de entrada"](../agent_context/SDD.md)). Este documento cobre a configuração necessária para rodar o painel e o fluxo de autenticação para quem for operar ou dar manutenção nele, conforme as tarefas `painel/*` do [`agent_context/PLAN.md`](../agent_context/PLAN.md) forem concluídas.

## Configuração

Variáveis de ambiente lidas de `import.meta.env` pelo Vite em build time (`apps/admin/src/lib/supabase-client.ts`), nunca hardcoded. Copie `apps/admin/.env.example` para `apps/admin/.env` (arquivo local, ignorado pelo Git) e ajuste:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL da API do projeto Supabase — a mesma usada por `apps/api` (local: `http://127.0.0.1:54321`, ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sim | Chave `anon`/publicável do projeto Supabase. **Nunca** a `service_role` — essa é exclusiva de `apps/api` (ver [`docs/API.md`](./API.md)) e nunca deve chegar a código que roda no navegador (SDD § "Isolamento das credenciais e da superfície pública"). |

Os valores em `apps/admin/.env.example` já vêm preenchidos com os defaults **públicos e conhecidos** de qualquer instância local do Supabase CLI (mesma chave `anon` documentada em [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md) e usada pelos testes de `apps/api`) — não são segredo real, servem só para desenvolvimento contra `npx supabase start` local. Um ambiente de produção real usa a chave publicável do projeto Supabase dedicado ao Ketochlor.

Qualquer prefixo diferente de `VITE_` é ignorado pelo Vite em build time — por isso as duas variáveis acima usam esse prefixo, ao contrário das variáveis de `apps/api` (lidas em runtime de `process.env`, sem prefixo).

## Autenticação (`painel/tela-login`)

O painel **não fala com a API para autenticar** — ele usa o SDK cliente do Supabase (`@supabase/supabase-js`, com a chave publicável) diretamente contra o Supabase Auth, o mesmo projeto que a API verifica via JWKS (SDD § Contratos de dados/API/interfaces → Autenticação). A API nunca implementa um endpoint de login; ela só recebe o token que o painel já obteve, no header `Authorization: Bearer <jwt>` de cada chamada a `/api/admin/*` (ver [`docs/API.md` § Autenticação](./API.md)).

### Cliente Supabase

Instância única em `apps/admin/src/lib/supabase-client.ts` (`createClient`), construída a partir de `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`. `persistSession` e `autoRefreshToken` são `true` por padrão no SDK — a sessão já é guardada em `localStorage` e renovada automaticamente sem nenhuma configuração extra; nenhum código do painel implementa storage ou refresh de sessão por conta própria.

### Estado de sessão

`apps/admin/src/auth/auth-context.tsx` é a fonte única de verdade da sessão para o painel inteiro: lê a sessão persistida ao montar (`supabase.auth.getSession()`) e escuta login/logout/renovação de token em tempo real (`supabase.auth.onAuthStateChange`) — os dois mecanismos recomendados pelo próprio SDK, em vez de qualquer polling ou storage próprio. O `AuthProvider` expõe `useAuth()` (`{ session, isLoading }`) para o resto da árvore de componentes.

### Roteamento e proteção de rota

O painel usa **React Router** (`react-router-dom`, modo declarativo — `BrowserRouter`/`Routes`/`Route`) — escolhido por ser o roteador padrão de fato do ecossistema React para uma SPA client-side simples como esta (sem necessidade de data loaders/SSR), com suporte nativo a `basename` para casar as rotas internas com o prefixo `/admin` do ponto único de entrada.

`apps/admin/src/App.tsx` monta `<BrowserRouter basename="/admin">`, então a rota `/login` do React Router já resolve para a URL real `/admin/login`, sem duplicar o prefixo — nenhuma rota do código referencia `/admin` explicitamente.

Duas rotas hoje:

| Rota (React Router) | URL real | Componente | Acesso |
|---|---|---|---|
| `/login` | `/admin/login` | `LoginPage` | Só sem sessão — com sessão válida, redireciona ao dashboard (`PublicOnlyRoute`) |
| `/` | `/admin` | `DashboardPage` | Só com sessão — sem sessão válida, redireciona ao login (`ProtectedRoute`) |

`ProtectedRoute` e `PublicOnlyRoute` (`apps/admin/src/auth/`) são as duas guardas: ambas leem `useAuth()` e usam `<Navigate replace>` para redirecionar antes de renderizar a rota real, cobrindo a exigência do PRD de que "nenhuma tela sob `/admin` é alcançável sem sessão válida" — a próxima tarefa do painel (`painel/listagem-secoes`) que precisar de uma rota nova autenticada adiciona um `<Route>` dentro do mesmo `<Route element={<ProtectedRoute />}>`, sem duplicar a checagem de sessão.

**Nota de segurança:** estas guardas são só uma conveniência de UX no cliente — a barreira real de autorização é o `AuthGuard` da API (`apps/api`, ver `docs/API.md`), que rejeita qualquer chamada a `/api/admin/*` sem um token válido. Mesmo que alguém burle a UI do painel, nenhum dado administrativo sai do servidor sem o token correto.

### Tela de login

`apps/admin/src/pages/login-page.tsx`: formulário de e-mail/senha, chama `supabase.auth.signInWithPassword`. Uma credencial inválida (e-mail ou senha errados) mostra "E-mail ou senha inválidos." em um elemento `role="alert"`, sem navegar — a mesma mensagem genérica para os dois casos, para não revelar se um e-mail existe ou não na base.

### Dashboard (placeholder)

`apps/admin/src/pages/dashboard-page.tsx` é hoje um placeholder vazio, só para provar o redirecionamento (sem sessão → login; logado, acessar `/admin/login` → dashboard) e hospedar o botão de logout. A listagem real das 11 seções chega na tarefa `painel/listagem-secoes`.

### Logout

Botão "Sair" no dashboard chama `supabase.auth.signOut()`. O próprio `onAuthStateChange` do `AuthProvider` limpa a sessão em memória e `ProtectedRoute` redireciona ao login — nenhuma navegação manual é feita pelo botão.

## Como testar localmente com um usuário de operador

```bash
npx supabase start   # sobe Auth local (ver docs/BANCO-DE-DADOS.md)

# cria um usuário de teste via API REST do GoTrue, com a chave service_role
# (a mesma de apps/api/.env.example — nunca em apps/admin/.env)
curl -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "apikey: <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"operador.teste@ketochlor.local","password":"<senha>","email_confirm":true}'

npm run dev --prefix apps/admin   # ou `npm run dev` na raiz, para o ponto único de entrada completo
```

Alternativa sem `curl`: criar o usuário pelo Supabase Studio local (`http://127.0.0.1:54323` → Authentication → Add user).

`npx supabase stop` ao final da sessão de trabalho, para não deixar os containers ativos (mesma recomendação de [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)).
