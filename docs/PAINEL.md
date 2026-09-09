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

Rotas hoje:

| Rota (React Router) | URL real | Componente | Acesso |
|---|---|---|---|
| `/login` | `/admin/login` | `LoginPage` | Só sem sessão — com sessão válida, redireciona à listagem de seções (`PublicOnlyRoute`) |
| `/` (índice) | `/admin` | `SectionListPage`, dentro de `AdminLayout` | Só com sessão — sem sessão válida, redireciona ao login (`ProtectedRoute`) |
| `/sections/:key` | `/admin/sections/:key` | `SectionDetailPage` (placeholder), dentro de `AdminLayout` | Idem |
| `/metadata` | `/admin/metadata` | `MetadataPage`, dentro de `AdminLayout` | Idem |
| `/leads` | `/admin/leads` | `LeadsPage`, dentro de `AdminLayout` | Idem |

`ProtectedRoute` e `PublicOnlyRoute` (`apps/admin/src/auth/`) são as duas guardas: ambas leem `useAuth()` e usam `<Navigate replace>` para redirecionar antes de renderizar a rota real, cobrindo a exigência do PRD de que "nenhuma tela sob `/admin` é alcançável sem sessão válida".

Dentro de `<Route element={<ProtectedRoute />}>`, `App.tsx` aninha um segundo nível — `<Route element={<AdminLayout />}>` — que envolve toda rota autenticada com o cabeçalho de navegação (ver "Layout e navegação" abaixo). `painel/tela-metadados` e `painel/tela-leads` foram implementadas em paralelo, cada uma em um worktree isolado a partir do mesmo ponto de `main` (decisão do usuário, 2026-09-09) — cada uma só precisou de um `<Route path="..." element={...} />` a mais dentro desse mesmo bloco, sem tocar em `AdminLayout` (o link de navegação para as duas já existia desde `painel/listagem-secoes`); o conflito trivial de merge em `App.tsx` (uma linha de `<Route>` de cada tarefa) foi resolvido pelo orquestrador ao integrar as duas.

**Nota de segurança:** estas guardas são só uma conveniência de UX no cliente — a barreira real de autorização é o `AuthGuard` da API (`apps/api`, ver `docs/API.md`), que rejeita qualquer chamada a `/api/admin/*` sem um token válido. Mesmo que alguém burle a UI do painel, nenhum dado administrativo sai do servidor sem o token correto.

### Tela de login

`apps/admin/src/pages/login-page.tsx`: formulário de e-mail/senha, chama `supabase.auth.signInWithPassword`. Uma credencial inválida (e-mail ou senha errados) mostra "E-mail ou senha inválidos." em um elemento `role="alert"`, sem navegar — a mesma mensagem genérica para os dois casos, para não revelar se um e-mail existe ou não na base.

## Layout e navegação (`painel/listagem-secoes`)

`apps/admin/src/layout/admin-layout.tsx` é o elemento pai de toda rota sob `<ProtectedRoute />` (registrado em `App.tsx`, `<Route element={<AdminLayout />}>`, com `<Outlet />` renderizando a página de cada rota filha). Um único cabeçalho, presente em toda tela autenticada:

- Nome do painel ("Painel Ketochlor").
- Navegação (`NavLink`) para as três áreas: "Seções" (`/`), "Metadados" (`/metadata`) e "Leads" (`/leads`). Os dois últimos links já existem antes de as páginas correspondentes existirem (`painel/tela-metadados`, `painel/tela-leads`, ambas dependentes só desta tarefa) — clicar neles hoje é um 404 esperado, até essas tarefas registrarem a rota em `App.tsx`.
- Botão "Sair", que chama `supabase.auth.signOut()`. O próprio `onAuthStateChange` do `AuthProvider` limpa a sessão em memória e `ProtectedRoute` redireciona ao login — nenhuma navegação manual é feita pelo botão (mesmo comportamento de antes, só que agora centralizado no layout em vez de duplicado em cada página).

## Listagem de seções (`painel/listagem-secoes`)

`apps/admin/src/pages/sections/section-list-page.tsx` é a rota índice (`/`, URL real `/admin`): busca `GET /api/admin/sections` (`docs/API.md`) com `fetch` autenticado (`apps/admin/src/lib/api-client.ts`, função `apiFetch` — cabeçalho `Authorization: Bearer <session.access_token>`, do `AuthContext`) e renderiza as 11 seções **na ordem em que a API já as devolve** — a própria API garante essa ordem a partir de `CONTENT_SECTIONS` (`@ketochlor/content-schema`, ver comentário de decisão em `ListarSecoesUseCase`), então o painel não precisa conhecer nem repetir essa ordem.

Cada linha mostra:
- Um rótulo em português amigável (`apps/admin/src/pages/sections/section-labels.ts`, `SECTION_LABELS: Record<SectionKey, string>` — ex. `tecnologia_sis` → "Tecnologia SIS"), nunca o identificador técnico cru.
- Se a seção está publicada ou não (`isPublished`).
- A data da última atualização (`updatedAt`), formatada com `Intl.DateTimeFormat('pt-BR')`.

Clicar em uma linha navega para `/sections/:key` (URL real `/admin/sections/:key`), hoje servida por `apps/admin/src/pages/sections/section-detail-page.tsx` — um placeholder ("Edição da seção {key} — em construção") que só prova que a navegação funciona. O formulário real de edição (campos de texto, listas, upload de imagem) chega na tarefa `painel/formulario-edicao-secao`.

`apps/admin/src/lib/api-client.ts` (`apiFetch`, `ApiError`) é genérico o bastante para as próximas telas autenticadas (`painel/tela-metadados`, `painel/tela-leads`) reaproveitarem sem reimplementar o cabeçalho `Authorization` ou o tratamento de erro — nenhuma URL absoluta de API é montada em lugar nenhum do painel: tanto o dev server (proxy de `apps/lp/vite.config.ts`) quanto o nginx de produção (`docker/nginx.conf`) servem painel e API sob o mesmo domínio, então um caminho relativo (`/api/admin/sections`) já resolve certo nos dois ambientes.

## Metadados da página (`painel/tela-metadados`)

`apps/admin/src/pages/metadata/metadata-page.tsx` é a rota `/metadata` (URL real `/admin/metadata`): busca `GET /api/admin/metadata` ao montar e salva via `PUT /api/admin/metadata` (`docs/API.md` § Metadados), mesmo padrão de tela autenticada de `SectionListPage` (`apiFetch` com `session.access_token`, estado de carregamento/erro explícito).

Formulário controlado com três campos — `title`, `description` e `ogImageMediaId` — e três estados visíveis ao operador: carregando (busca inicial), erro de validação ao salvar (mensagem real devolvida pela API, nunca uma mensagem genérica de "erro ao salvar") e confirmação de sucesso. Salvar com `title`/`description` vazio não navega nem limpa o que o operador já digitou — só mostra o erro, exatamente como a API o descreve.

**Simplificação declarada desta tarefa:** `ogImageMediaId` é um campo de texto livre para colar o id de um `media_assets` já existente, não um seletor de imagem com upload de verdade. O upload real de arquivo (`POST /api/admin/media/upload-url` + envio ao Storage, já documentado em [`docs/API.md` § Mídia](./API.md)) é escopo da tarefa `painel/formulario-edicao-secao`; quando ela existir, o mesmo seletor de imagem usado ali pode substituir este campo de texto sem mudar o contrato com a API (`ogImageMediaId` continua sendo só um id de string ou `null`).

**Extensão de `api-client.ts` nesta tarefa:** `ApiError` passou a carregar também `erros: { campo, mensagem }[] | null` (`null` fora de um `422` com a extensão `erros` do formato uniforme de erro, `docs/API.md` § Autenticação → "Formato de erro uniforme") — necessário para `MetadataPage` mostrar a mensagem de validação real por campo, em vez de só o `message` genérico do topo da resposta. Mudança aditiva e compatível com o uso já existente em `SectionListPage`.

## Consulta e exportação de leads (`painel/tela-leads`)

`apps/admin/src/pages/leads/leads-page.tsx` é a rota `/leads` (URL real `/admin/leads`, dentro de `AdminLayout`): busca `GET /api/admin/leads?from=&to=` (`docs/API.md`) com `apiFetch`, mesmo padrão de `SectionListPage`. A própria API já devolve os leads mais recente primeiro (`LeadsRepository.listarPorPeriodo`, `ORDER BY created_at DESC`) — a tela não reordena nada no cliente.

**Filtro de período:** dois `<input type="date">` (`from`/`to`). Como a API filtra `created_at` (`timestamptz`) por comparação direta e o `<input type="date">` só devolve `"AAAA-MM-DD"`, a tela completa cada limite antes de montar a query string — `from` vira início do dia (`T00:00:00.000Z`) e `to` vira fim do dia (`T23:59:59.999Z`) — para o filtro cobrir o dia inteiro escolhido no seletor dos dois lados, em vez de `to` excluir por engano os leads criados depois da meia-noite UTC daquele dia. Qualquer mudança nos dois campos refaz a busca automaticamente (sem botão "aplicar" separado).

**Exportação CSV — autenticação do download:** `GET /api/admin/leads/export.csv` exige `Authorization: Bearer <jwt>` (`apps/api/src/presentation/leads/leads-admin.controller.ts` não aceita token via query param), mas uma navegação simples do navegador para essa URL (um `<a href>` normal, ou `window.open`) não anexa nenhum cabeçalho customizado — a API responderia `401`. A tela resolve isso buscando o CSV com `fetch` autenticado (`apiFetchTexto`, nova função em `apps/admin/src/lib/api-client.ts`, irmã de `apiFetch` para respostas que não são JSON) e então monta o download no próprio cliente: `Blob` com o texto recebido (`type: 'text/csv;charset=utf-8'`) + `URL.createObjectURL` + um `<a download>` programático clicado via `HTMLElement.click()`, revogando a URL do objeto logo depois. O nome do arquivo inclui o período filtrado (`leads-<from>-a-<to>.csv`) quando algum filtro está ativo, ou `leads.csv` sem filtro algum.

**Exclusão:** o botão "Excluir" de cada linha pede confirmação com `window.confirm` (texto inclui nome e e-mail do lead, para não ser um clique único acidental) antes de chamar `DELETE /api/admin/leads/:id`; a listagem é refeita a partir da API assim que a exclusão é confirmada pelo servidor, então o lead removido nunca reaparece nem depende de o cliente "adivinhar" o novo estado. `DELETE` bem-sucedido devolve `204 No Content` (sem corpo) — `apiFetch` foi ajustado para não tentar fazer `.json()` de uma resposta sem conteúdo (`HTTP_STATUS_SEM_CONTEUDO`), o que quebraria essa chamada (e qualquer outra rota futura que devolva `204`).

Colunas da tabela: nome, e-mail, telefone, CRMV, cidade/UF, especialidade, "já é cliente Virbac" e "deseja contato comercial" (Sim/Não), origem, data de recebimento (`Intl.DateTimeFormat('pt-BR')`) e a ação de excluir — todos os campos de `LeadPersistido` (`docs/API.md` § Leads), na mesma ordem do CSV.

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
