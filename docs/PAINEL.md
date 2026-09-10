# Painel (`apps/admin`)

React 18 + Vite 5 + TypeScript 5, servido sob `/admin` no mesmo domínio da LP (ver [`agent_context/SDD.md` § "Ponto único de entrada"](../agent_context/SDD.md)). Este documento cobre a configuração necessária para rodar o painel e o fluxo de autenticação para quem for operar ou dar manutenção nele, conforme as tarefas `painel/*` do [`agent_context/PLAN.md`](../agent_context/PLAN.md) forem concluídas.

## Configuração

Variáveis de ambiente lidas de `import.meta.env` pelo Vite em build time (`apps/admin/src/lib/supabase-client.ts`), nunca hardcoded. Copie `apps/admin/.env.example` para `apps/admin/.env` (arquivo local, ignorado pelo Git) e ajuste:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | sim | URL da API do projeto Supabase — a mesma usada por `apps/api` (local: `http://127.0.0.1:54321`, ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sim | Chave `anon`/publicável do projeto Supabase. **Nunca** a `service_role` — essa é exclusiva de `apps/api` (ver [`docs/API.md`](./API.md)) e nunca deve chegar a código que roda no navegador (SDD § "Isolamento das credenciais e da superfície pública"). |
| `VITE_SUPABASE_STORAGE_BUCKET` | não (default `images`) | Bucket de Storage das imagens do CMS (`lib/media-upload.ts`, upload de imagem do formulário de edição de seção) — o mesmo bucket configurado em `SUPABASE_STORAGE_BUCKET` de `apps/api/.env.example`. |

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
| `/sections/:key` | `/admin/sections/:key` | `SectionDetailPage` (formulário de edição, `painel/formulario-edicao-secao`), dentro de `AdminLayout` | Idem |
| `/metadata` | `/admin/metadata` | `MetadataPage`, dentro de `AdminLayout` | Idem |
| `/leads` | `/admin/leads` | `LeadsPage`, dentro de `AdminLayout` | Idem |

`ProtectedRoute` e `PublicOnlyRoute` (`apps/admin/src/auth/`) são as duas guardas: ambas leem `useAuth()` e usam `<Navigate replace>` para redirecionar antes de renderizar a rota real, cobrindo a exigência do PRD de que "nenhuma tela sob `/admin` é alcançável sem sessão válida".

Dentro de `<Route element={<ProtectedRoute />}>`, `App.tsx` aninha um segundo nível — `<Route element={<AdminLayout />}>` — que envolve toda rota autenticada com o cabeçalho de navegação (ver "Layout e navegação" abaixo). `painel/tela-metadados` e `painel/tela-leads` foram implementadas em paralelo, cada uma em um worktree isolado a partir do mesmo ponto de `main` (decisão do usuário, 2026-09-09) — cada uma só precisou de um `<Route path="..." element={...} />` a mais dentro desse mesmo bloco, sem tocar em `AdminLayout` (o link de navegação para as duas já existia desde `painel/listagem-secoes`); o conflito trivial de merge em `App.tsx` (uma linha de `<Route>` de cada tarefa) foi resolvido pelo orquestrador ao integrar as duas.

**Nota de segurança:** estas guardas são só uma conveniência de UX no cliente — a barreira real de autorização é o `AuthGuard` da API (`apps/api`, ver `docs/API.md`), que rejeita qualquer chamada a `/api/admin/*` sem um token válido. Mesmo que alguém burle a UI do painel, nenhum dado administrativo sai do servidor sem o token correto.

### Tela de login

`apps/admin/src/pages/login-page.tsx`: formulário de e-mail/senha, chama `supabase.auth.signInWithPassword`. Uma credencial inválida (e-mail ou senha errados) mostra "E-mail ou senha inválidos." em um elemento `role="alert"`, sem navegar — a mesma mensagem genérica para os dois casos, para não revelar se um e-mail existe ou não na base.

## Identidade visual: cor compartilhada com a LP, tipografia própria

O painel compartilha com a landing page **apenas a paleta de cor da marca**, via o pacote `@ketochlor/design-tokens` (`packages/design-tokens`). O pacote exporta as cores reais do Ketochlor — `navy`, `gold`, `blue.institutional`, `graytxt`, `lighttint`, `cardborder` — e `apps/admin/tailwind.config.ts` as injeta em `theme.extend.colors` com os MESMOS nomes já usados em `apps/lp/tailwind.config.ts`, de modo que uma classe como `text-navy` significa exatamente a mesma coisa nas duas aplicações. Como é `extend` (e não substituição de `theme`), a paleta padrão do Tailwind continua disponível — e é ela, `slate` à frente, que forma toda a UI neutra do painel.

O pacote **não tem passo de build**: `main` aponta direto para `src/index.ts` e não existe script `build`. O único consumidor é o `tailwind.config.ts` de cada app, carregado pelo loader do próprio Tailwind, que transpila TypeScript on-the-fly inclusive através do link de workspace em `node_modules`. Em contrapartida, todo estágio de `docker/Dockerfile` que roda `npm ci` precisa copiar o `package.json` do pacote antes (é ele que cria o link de workspace); o `src/` chega pelo `COPY . .`.

Três decisões de design deliberadas, para não parecerem descuido:

- **Tipografia neutra, não as fontes da marca.** O painel usa a fonte padrão do sistema (`font-sans`), não Sora/Inter da LP. É uma ferramenta interna de edição, e a densidade utilitária de uma tabela de leads ou de um formulário longo não é a mesma de uma página de venda. Só a COR é compartilhada — tipografia e densidade visual são de cada aplicação.
- **A cor de marca é acento, não preenchimento de ação.** O botão primário (salvar) é `slate-900`/`slate-700` no escuro; `blue.institutional` fica reservado ao item ativo de navegação e ao hover de link no claro (com um azul mais claro, `blue-300`, no escuro — ver "Tema escuro" abaixo), e `navy` a texto/heading e ao bloco de marca da barra lateral. Um painel inteiro pintado na cor de CTA da LP perde a hierarquia que a cor deveria dar.

### Tema escuro (`ajustes/tema-escuro-logo-e-campo-de-imagem`)

**Correção de uma decisão anterior:** a tarefa `ajustes/estiliza-painel-admin` decidiu deliberadamente não implementar tema escuro ("o painel não tem alternador de tema"). O usuário pediu a reversão dessa decisão ao comparar o painel com o painel de referência da mesma marca, que respeita a preferência de tema do sistema operacional por padrão — o Ketochlor não respeitava, e por isso os botões (e o resto da UI) pareciam "diferentes" sempre que o sistema operacional estava em modo escuro.

Mecanismo:
- `apps/admin/tailwind.config.ts` declara `darkMode: 'class'` — toda variante `dark:` escrita no painel só ativa quando a classe `dark` está presente em `<html>`.
- `apps/admin/src/theme/theme-context.tsx` (`ThemeProvider`/`useTheme`) é quem alterna essa classe. Tema inicial: a escolha já salva do operador (`localStorage`, chave `ketochlor.painel.tema`) ou, na ausência de qualquer escolha salva, a preferência do sistema operacional (`window.matchMedia('(prefers-color-scheme: dark)')`). Cada alternância manual grava a nova escolha na mesma chave — a partir daí ela sempre vence a preferência do sistema, até o operador limpar os dados do site.
- `ThemeProvider` envolve o `<App />` inteiro (`App.tsx`), acima até do `<BrowserRouter>` — o tema é uma preferência do NAVEGADOR, não da sessão autenticada, então `/login` também precisa respeitá-lo.
- O botão de alternância (ícones `Moon`/`Sun` de `lucide-react`, `aria-label` dinâmico "Ativar tema escuro"/"Ativar tema claro") fica no cabeçalho de `AdminLayout`, ao lado do e-mail do operador e do botão "Sair".
- Toda tela e todo componente compartilhado do painel ganhou variante `dark:` — nenhuma tela ficou de fora (login, listagem e edição de seção com todos os tipos de campo, metadados, leads, `Card`/`Notice`/`ActionBar`/`FormField`/`classes.ts`/`Dropzone`) — sempre na mesma família neutra `slate` do modo claro, só invertida (texto claro sobre fundo escuro).

### Componentes compartilhados (`apps/admin/src/shared/`)

Componentes pequenos e próprios, não uma biblioteca de terceiros (sem shadcn/Radix/MUI) — ícones vêm de `lucide-react`:

| Arquivo | Papel |
|---|---|
| `Card.tsx` | Bloco branco com borda `cardborder` e padding. Recebe `!p-0` quando envolve uma lista/tabela que já tem espaçamento por linha. |
| `Notice.tsx` | Aviso inline de sucesso (verde) ou erro (vermelho), com ícone e `role="status"`/`role="alert"` conforme o tipo. |
| `ActionBar.tsx` | Barra fixa no rodapé da viewport para o botão de salvar de formulário longo, com `backdrop-blur`. Quem a usa reserva a altura dela com `pb-24`. Recebe `start` (opcional, ex. link "Voltar") e `end` (sempre presente — mensagens de estado + botão de ação); alinhados às pontas opostas da barra (correção da tarefa `ajustes/corrige-layout-formularios-menu-e-nomenclaturas` — antes só `children`, sempre à direita). Por ser `fixed`, ocupa a largura da viewport inteira, não a do conteúdo recuado pela barra lateral — `left` desloca com a mesma largura da barra lateral via a variável CSS `--admin-sidebar-largura`, definida por `AdminLayout` no ancestral comum (herda por cascata mesmo através de `position: fixed`, que não afeta herança de variável CSS); sem isso, o `start` renderizaria atrás da barra lateral em telas largas. |
| `FormField.tsx` | Rótulo + controle + texto de ajuda + erro, e `atributosDeCampo` para ligar tudo por `aria-describedby`/`aria-invalid`. |
| `classes.ts` | Classes base de campo e de botão (primário/secundário/perigo). Campo em erro é uma variante **exclusiva**, não um sufixo somado à variante normal: no CSS gerado pelo Tailwind as utilidades de `border-color` saem em ordem alfabética, então `.border-red-400` vem ANTES de `.border-slate-300` e aplicar as duas juntas deixaria a cor neutra vencer. |
| `Dropzone.tsx` | Campo de imagem como área de soltar/enviar — ver "Upload de imagem" abaixo. Compartilhado por `ImageFieldEditor` (seções) e `MetadataPage`. |

## Layout e navegação (`painel/listagem-secoes`)

`apps/admin/src/layout/admin-layout.tsx` é o elemento pai de toda rota sob `<ProtectedRoute />` (registrado em `App.tsx`, `<Route element={<AdminLayout />}>`, com `<Outlet />` renderizando a página de cada rota filha).

- **Barra lateral** fixa à esquerda em desktop, com a navegação para as três áreas: "Seções da página" (`/`), "Metadados da página" (`/metadata`) e "Leads recebidos" (`/leads`) — as três rotas registradas em `App.tsx` (ver "Rotas hoje" acima). É recolhível (vira uma coluna só de ícones) e o estado fica lembrado em `localStorage`, na chave `ketochlor.painel.sidebar-recolhida`; leitura e escrita são protegidas por `try/catch`, porque o acessador pode lançar em janela privada ou com dados de site bloqueados — nesse caso o painel simplesmente abre expandido. Ícones: `LayoutList` (Seções), `Tags` (Metadados), `Inbox` (Leads — correção da tarefa `ajustes/corrige-layout-formularios-menu-e-nomenclaturas`, comparada ao painel de referência; era `Users`, reservado agora ao módulo de Operadores).
- **Logo real no topo** (`MarcaDoPainel`, correção da tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`: a tarefa anterior usava deliberadamente um selo decorativo com a letra "K" "no lugar de um logo que o painel não precisa" — decisão revertida a pedido do usuário). O logo é o MESMO PNG que `apps/lp/src/components/Header.tsx`/`Footer.tsx` já servem (`apps/lp/public/assets/logo-ketochlor-transp.png`), copiado para `apps/admin/public/assets/logo-ketochlor-transp.png` — duplicação de arquivo deliberada e aceita, não um descuido: `apps/admin` é um app Vite próprio (não importa de dentro de `apps/lp`) e este logo é um asset estático local, não uma URL de Storage compartilhável entre os dois apps (diferente do painel de referência). Aparece tanto na barra lateral de desktop quanto no topo da gaveta mobile. **Correção da tarefa `ajustes/corrige-layout-formularios-menu-e-nomenclaturas`:** o texto "Ketochlor" que ficava ao lado da imagem foi removido (o `alt` já dá o nome acessível), o logo ficou maior (`h-8` → `h-12` com a barra expandida; a barra RECOLHIDA mantém `h-8`, que é o que cabe nos ~44px úteis daquele estado) e centralizado horizontalmente no espaço da marca.
- Abaixo de `lg`, a barra vira uma **gaveta** sobre o conteúdo, aberta pelo botão de menu do cabeçalho e fechada ao navegar. Os dois — barra e gaveta — renderizam o MESMO componente de navegação (`NavegacaoDoPainel`, a partir da mesma lista `LINKS_DE_NAVEGACAO`), nunca markup duplicado: é assim que um link novo não passa a existir só em um dos dois lugares.
- **Cabeçalho** separado da barra lateral e sempre visível (`sticky`): botão de abrir menu (só em mobile) e, à direita, alternador de tema → e-mail do operador logado → botão "Sair", que chama `supabase.auth.signOut()`. O próprio `onAuthStateChange` do `AuthProvider` limpa a sessão em memória e `ProtectedRoute` redireciona ao login — nenhuma navegação manual é feita pelo botão. **Correção da tarefa `ajustes/corrige-layout-formularios-menu-e-nomenclaturas`** (comparada ao painel de referência): o texto fixo "Painel Ketochlor" que ficava à esquerda do cabeçalho foi removido por completo (o cabeçalho não tem mais título próprio, só o botão de menu em mobile), e a ordem dos itens à direita mudou de e-mail→tema→sair para tema→e-mail→sair.
- **Conteúdo** da rota filha centralizado com largura máxima de leitura (`max-w-5xl mx-auto`), nunca esticado na largura toda da tela.

## Listagem de seções (`painel/listagem-secoes`)

`apps/admin/src/pages/sections/section-list-page.tsx` é a rota índice (`/`, URL real `/admin`): busca `GET /api/admin/sections` (`docs/API.md`) com `fetch` autenticado (`apps/admin/src/lib/api-client.ts`, função `apiFetch` — cabeçalho `Authorization: Bearer <session.access_token>`, do `AuthContext`) e renderiza as 11 seções **na ordem em que a API já as devolve** — a própria API garante essa ordem a partir de `CONTENT_SECTIONS` (`@ketochlor/content-schema`, ver comentário de decisão em `ListarSecoesUseCase`), então o painel não precisa conhecer nem repetir essa ordem.

Cada linha mostra:
- Um rótulo em português amigável (`apps/admin/src/pages/sections/section-labels.ts`, `SECTION_LABELS: Record<SectionKey, string>` — ex. `tecnologia_sis` → "Tecnologia SIS"), nunca o identificador técnico cru.
- Se a seção está publicada ou não (`isPublished`).
- A data da última atualização (`updatedAt`), formatada com `Intl.DateTimeFormat('pt-BR')`.

Clicar em uma linha navega para `/sections/:key` (URL real `/admin/sections/:key`), servida por `apps/admin/src/pages/sections/section-detail-page.tsx` — o formulário de edição descrito na próxima seção.

`apps/admin/src/lib/api-client.ts` (`apiFetch`, `ApiError`) é genérico o bastante para as próximas telas autenticadas (`painel/tela-metadados`, `painel/tela-leads`) reaproveitarem sem reimplementar o cabeçalho `Authorization` ou o tratamento de erro — nenhuma URL absoluta de API é montada em lugar nenhum do painel: tanto o dev server (proxy de `apps/lp/vite.config.ts`) quanto o nginx de produção (`docker/nginx.conf`) servem painel e API sob o mesmo domínio, então um caminho relativo (`/api/admin/sections`) já resolve certo nos dois ambientes.

## Edição de seção (`painel/formulario-edicao-secao`)

`apps/admin/src/pages/sections/section-detail-page.tsx` é a rota `/sections/:key` (URL real `/admin/sections/:key`): busca `GET /api/admin/sections/:key` ao montar (`data`, `itemVisibility`, `isPublished` — `docs/API.md` § Conteúdo) e salva via `PUT /api/admin/sections/:key`, mesmo padrão de tela autenticada das demais.

### Um só `Card` para os campos simples, um fieldset próprio por lista (`ajustes/corrige-layout-formularios-menu-e-nomenclaturas`)

**Correção de QA visual, comparada ao painel de referência:** antes, `SectionDetailPage` envolvia CADA campo de topo de seção no seu próprio `<Card>` (`descritores.map((d) => <Card key={d.chave}>...)`), deixando o formulário como uma sequência de blocos brancos soltos. A tela passou a agrupar os descritores em dois conjuntos, na mesma ordem relativa em que já apareciam:

- **`texto`/`imagem`/`lista-texto`/`estrutura-fixa`** (todo tipo exceto `lista-item`) — juntos dentro de um ÚNICO `Card`, como um formulário coeso.
- **`lista-item`** (ex. `faq.perguntas`, `protocolo.dosagem`) — cada um FORA desse `Card`, com o próprio destaque visual: um `fieldset` com borda própria (`rounded-lg border ... bg-white ... p-4`, com variante `dark:`), já que deixa de estar dentro de um `Card` que lhe dava essa moldura antes. `ItemListFieldEditor` é quem já traz essa borda — nenhum wrapper extra em `SectionDetailPage`.

A tela de Metadados (`MetadataPage`) já usava um único `Card` e não precisou mudar nesse ponto — ela não tem campo `lista-item`.

O link "Voltar para a lista de seções" (antes solto acima do título, com o texto "Voltar para as seções") mudou para dentro da própria `ActionBar`, como `start` — ver "Componentes compartilhados" acima. O botão de salvar da tela de seção passou de "Salvar" para "Salvar e publicar" (com o ícone `Save` ao lado), para deixar claro que a ação afeta o conteúdo publicado; a tela de Metadados manteve "Salvar" (ela não "publica" uma seção).

### Formulário GERADO a partir do schema, não 11 telas hardcoded

`apps/admin/src/pages/sections/schema-fields.ts` (`descreverCamposDaSecao`) faz introspecção direta do schema **Zod** de cada seção, importado de `@ketochlor/content-schema` (agora também dependência de `apps/admin`) — nenhuma segunda definição de "quais campos a seção X tem" existe no painel. A partir do `shape` do schema, cada campo de topo de seção cai em um de cinco tipos, cada um com seu próprio componente em `apps/admin/src/pages/sections/components/` (SRP — um componente por tipo de campo, nenhum "form builder" genérico além do que as 11 seções reais precisam):

| Forma do schema Zod | Tipo detectado | Componente | Comportamento |
|---|---|---|---|
| `z.string()` | `texto` | `ScalarFieldEditor` | `<input>` ou `<textarea>`, decidido pelo TAMANHO ATUAL do valor (> 60 caracteres ou com quebra de linha vira `<textarea>`) — o schema não distingue "texto curto" de "parágrafo" (os dois são só `z.string()`), então o widget é decidido pelo conteúdo, não por uma anotação de schema nova. |
| A mesma instância de `imageFieldSchema` (`@ketochlor/content-schema/shared.ts`), comparada por **igualdade de referência** | `imagem` | `ImageFieldEditor` | Ver "Upload de imagem" abaixo. |
| `z.array(z.string())` (só `problema.paragraphs` hoje) | `lista-texto` | `StringListFieldEditor` | Adicionar/remover/reordenar parágrafo — **sem** `ItemVisibilityMap` associado (ver "Listas de item" abaixo). |
| `z.array(z.object({...}))` (`prova_autoridade.stats`, `protocolo.dosagem`, `diferenciais.items`, `faq.perguntas`) | `lista-item` | `ItemListFieldEditor` | Adicionar/editar/remover/reordenar item, com `ItemVisibilityMap` sincronizado. |
| Objeto aninhado que não é `imageFieldSchema` (`fenotipos.agudo`/`.cronico`, `mecanismo.cetoconazol`/`.clorexidina`, `protocolo.closing`) | `estrutura-fixa` | `FixedStructFieldEditor` | Campos editáveis, cardinalidade fechada — **sem** nenhum botão de adicionar/remover. |

Os campos escalares DENTRO de um item de lista ou de uma subestrutura fixa (ex. `dosagem[i].volumeMl`, `agudo.badge`) são sempre texto ou número (`z.ZodNumber` vira `<input type="number">`) — nenhuma das 11 seções hoje aninha uma lista ou uma imagem dentro de um item/subestrutura; se isso mudar, `schema-fields.ts` e os componentes de item precisam crescer (decisão de proporcionalidade registrada no próprio arquivo).

Rótulos em português amigável por CHAVE de campo (`apps/admin/src/pages/sections/field-labels.ts`, `rotuloDoCampo`) — não por seção, já que uma chave como `titulo`/`corpo` se repete com o mesmo sentido em mais de uma seção. Uma chave sem entrada cadastrada cai numa versão "humanizada" automática da própria chave, em vez de quebrar a tela.

### Listas de item e sincronia do `ItemVisibilityMap`

`ItemListFieldEditor` (usado por `prova_autoridade.stats`, `protocolo.dosagem`, `diferenciais.items`, `faq.perguntas`) oferece adicionar, editar, remover e reordenar (mover para cima/para baixo — decisão de escopo desta tarefa, sem drag-and-drop). Toda operação de mover/remover aplica a MESMA troca de índice ao array de conteúdo e ao array paralelo de `itemVisibility` daquele campo (`apps/admin/src/pages/sections/list-utils.ts`, `moverIndice`/`removerIndice`, chamadas duas vezes com o mesmo índice/direção) — é assim que os dois nunca dessincronizam entre uma reordenação e a próxima, já que nenhum item de `content-schema` tem `id` estável (`ItemVisibilityMap` é um mapa alinhado por ÍNDICE, ver `apps/api/src/domain/visibilidade/filtrar-conteudo-publicado.ts`).

`SectionDetailPage` sempre envia `data` **e** `itemVisibility` juntos no mesmo `PUT`, em TODO salvamento — nunca um sem o outro, mesmo quando nenhuma lista mudou nessa edição específica. `itemVisibility` é reconstruído a partir do estado local atual (que já é mantido em sincronia índice a índice pelo `ItemListFieldEditor`) para todo campo de lista-item da seção, a cada `handleSubmit`. Essa é a forma mais simples de nunca correr o risco descrito no `PLAN.md` (reordenar/reduzir uma lista e persistir um `itemVisibility` desalinhado) — a alternativa (só enviar `itemVisibility` quando "algo mudou" numa lista) exigiria detectar exatamente esse "algo mudou", uma superfície de bug maior do que sempre reenviar o mapa completo.

`StringListFieldEditor` (só `problema.paragraphs`) é deliberadamente um componente separado: adiciona/remove/reordena parágrafo mas NÃO tem `ItemVisibilityMap` associado, porque a visibilidade de item (Domínio) cobre listas de ITEM de conteúdo com significado próprio (uma pergunta, uma linha de dosagem), não um texto que só está dividido em parágrafos por conveniência de edição.

### Subestruturas fixas

`FixedStructFieldEditor` (`fenotipos.agudo`/`.cronico`, `mecanismo.cetoconazol`/`.clorexidina`, `protocolo.closing`) renderiza os campos editáveis da subestrutura sem nenhuma UI de adicionar/remover — a cardinalidade fechada é garantida simplesmente por o componente nunca oferecer esse botão, não por uma trava adicional (o schema Zod já impede a API de aceitar uma terceira chave nesse objeto).

### Upload de imagem — dropzone real, sem caixa de URL crua

`ImageFieldEditor` (`apps/admin/src/pages/sections/components/image-field.tsx`) implementa o upload de arquivo **real**, direto do navegador ao Supabase Storage, seguindo o fluxo já documentado em `docs/API.md` § Mídia: `POST /api/admin/media/upload-url` (credencial temporária) → `supabase.storage.from(bucket).uploadToSignedUrl(...)` (SDK do Supabase, `apps/admin/src/lib/media-upload.ts`) → `getPublicUrl(...)` para obter a URL pública, que vira o valor de `imagem.url`. Esta é a mesma instância de cliente Supabase já usada para Auth (`lib/supabase-client.ts`) — a credencial temporária, não a chave publicável, é quem autoriza a escrita no bucket.

**Correção da tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`:** a tarefa anterior (`ajustes/estiliza-painel-admin`) mantinha uma caixa de texto "URL da imagem" editável ABAIXO do upload — o usuário considerou isso "ridículo" e pediu a remoção completa: o operador nunca deve ver nem editar uma URL crua. A caixa foi removida por completo, das duas telas que a tinham (seções e, antes da correção de QA abaixo, também metadados). O campo de imagem agora é só `apps/admin/src/shared/Dropzone.tsx` — um retângulo de borda tracejada com ícone quando vazio, prévia da imagem preenchendo a área (`object-contain`) quando enviada, spinner + texto "Enviando…" durante o envio (sem percentual real: o SDK do Supabase Storage não expõe progresso de upload, e fabricar um número sem dado real por trás enganaria mais do que ajudaria) e um botão circular de excluir sobreposto no canto inferior direito — deliberadamente FORA do `<label>` que envolve o `<input type="file">` (um clique nele, se estivesse dentro, borbulharia até o input e abriria o seletor de arquivo por engano). Compartilhado entre `ImageFieldEditor` e `MetadataPage`.

**Correção da tarefa `ajustes/corrige-layout-formularios-menu-e-nomenclaturas`:** o `Dropzone` estava encaixado numa coluna estreita (`w-full sm:w-56`) ao lado do campo `alt`, nas duas telas. Agora cobre a LARGURA TOTAL do formulário (`w-full`, sem limite de largura), com o campo `alt` (quando existe) empilhado ABAIXO dele, não mais ao lado.

Como o projeto não tem um serviço de resolução de mídia por id (`media_assets` nunca é gravado de verdade — ver lacuna abaixo), o estado "tem imagem" vem diretamente de a URL do campo não ser vazia, de forma síncrona — sem nenhuma chamada de rede para "buscar" a mídia antes de decidir o que mostrar. Preservar uma imagem já migrada (caminho estático da LP, `/assets/...`) continua funcionando sem a caixa de texto: o operador simplesmente não troca o arquivo, e o valor da URL permanece o que já era — só deixou de ser um texto editável visível. A API ainda valida `url` (`imageFieldSchema`, não pode ficar vazia) e pode devolver um erro nesse caminho; sem a caixa de texto que antes o mostrava, ele aparece como texto solto abaixo do dropzone.

**Lacuna conhecida, não introduzida por esta tarefa:** o upload não chama `MediaAssetsRepository.criar` (não existe rota HTTP para essa confirmação — `docs/API.md` § Mídia já registra isso como fora do escopo de `api/modulo-media`), então não nasce uma linha de auditoria em `media_assets` para os uploads feitos por aqui. Isso não impede a imagem de funcionar na LP: `imageFieldSchema` só guarda `{ url, alt }`, nunca um id de mídia, e o bucket `images` é público para leitura — falta só a contabilidade de `media_assets`, não a funcionalidade.

`alt` é sempre obrigatório, lado a lado com o upload (PRD § Fluxo de UX). Bloqueio **no cliente**: `SectionDetailPage` verifica todo campo de imagem antes de chamar a API e recusa salvar (sem nenhuma requisição de rede) se algum `alt` estiver vazio, mostrando a mensagem junto ao campo — a validação `422` de `imageFieldSchema` continua ativa como rede de segurança caso esse bloqueio seja contornado.

### Erros de validação e confirmação de sucesso

Ao salvar: sucesso mostra "Seção salva com sucesso." (`role="status"`) e atualiza o formulário com o documento devolvido pela API. Uma falha de rede/servidor genérica mostra `erro.message`; um `422` com a extensão `erros` (`docs/API.md` § "Formato de erro uniforme") é mapeado por CAMINHO exato (`issue.path.join('.')` do Zod, ex. `"dosagem.1.volumeMl"`, `"logo.alt"`, `"eyebrow"`) para o campo correspondente na árvore de renderização — cada editor de campo recebe o `caminhoBase` do seu nível e sabe procurar seu próprio erro no mapa. Em qualquer caso de erro, `formData` permanece intacto: o operador nunca perde uma edição em andamento nem é levado para outra tela.

## Controle de visibilidade (`painel/controle-visibilidade`)

Dois controles distintos, ambos "ocultar sem apagar" (PRD § "Controle de visibilidade de item e de seção"): um para a SEÇÃO inteira, outro para um ITEM de dentro de uma lista.

### Visibilidade de seção inteira

No topo de `SectionDetailPage` (acima do formulário, fora do `<form>`), um badge ("Publicada"/"Não publicada" — mesmo estilo visual de `SectionListPage`) ao lado de um botão ("Ocultar seção"/"Publicar seção", o rótulo já indica a AÇÃO que o clique vai fazer, não o estado atual) que chama `PATCH /api/admin/sections/:key/visibility` (`docs/API.md` § Conteúdo administrativo — sem corpo, só inverte `is_published` no servidor e devolve o documento atualizado). O novo `isPublished`/`updatedAt` exibidos vêm sempre da RESPOSTA da API (`setSecao(atualizado)`), nunca invertidos otimisticamente no cliente antes de o servidor confirmar — e a chamada é independente de `formData`/`handleSubmit`: alternar a visibilidade não exige (nem afeta) uma edição de texto em andamento nem precisa do botão "Salvar" do formulário.

### Visibilidade de item de lista

Cada item dentro de `ItemListFieldEditor` (`prova_autoridade.stats`, `protocolo.dosagem`, `diferenciais.items`, `faq.perguntas`) ganhou um checkbox "Visível"/"Oculto" na mesma linha dos botões de mover/remover já existentes (`painel/formulario-edicao-secao`). Desmarcar o checkbox só troca a posição correspondente do array paralelo `visibilidade` (`ItemVisibilityMap`) — nunca mexe no array `itens` — usando exatamente o mesmo mecanismo de `onChange(itens, visibilidade)` que reordenar/remover já usam (ver "Listas de item e sincronia do `ItemVisibilityMap`" acima). Como qualquer outra edição de lista, ocultar um item só é persistido no próximo clique em "Salvar" da seção — não há chamada de rede própria para o checkbox — e o item continua existindo (e editável) na tela mesmo oculto; ele só desaparece de `GET /api/content` (e da LP) depois do `PUT`, e volta assim que o checkbox é remarcado e a seção é salva de novo.

## Metadados da página (`painel/tela-metadados`)

`apps/admin/src/pages/metadata/metadata-page.tsx` é a rota `/metadata` (URL real `/admin/metadata`): busca `GET /api/admin/metadata` ao montar e salva via `PUT /api/admin/metadata` (`docs/API.md` § Metadados), mesmo padrão de tela autenticada de `SectionListPage` (`apiFetch` com `session.access_token`, estado de carregamento/erro explícito).

Formulário controlado com três campos — `title`, `description` e `ogImageUrl` — e três estados visíveis ao operador: carregando (busca inicial), erro de validação ao salvar (mensagem real devolvida pela API, nunca uma mensagem genérica de "erro ao salvar") e confirmação de sucesso. Salvar com `title`/`description` vazio não navega nem limpa o que o operador já digitou — só mostra o erro, exatamente como a API o descreve.

**Upload real de imagem (correção da tarefa `ajustes/corrige-imagem-metadados`, achado de QA):** `ogImageMediaId` — campo de texto livre para colar o id de um `media_assets` que nenhuma rota da API jamais criava de verdade, tornando o campo inútil na prática — foi substituído por `ogImageUrl` com upload real de arquivo e preview, reaproveitando `enviarImagemParaStorage` (`apps/admin/src/lib/media-upload.ts`), a mesma função já usada pelos campos de imagem de SEÇÃO (`ImageFieldEditor`, ver "Edição de seção" acima).

**Correção da tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`:** a miniatura fixa + `<input type="file">` nativo viraram o dropzone compartilhado `apps/admin/src/shared/Dropzone.tsx` (mesmo componente de `ImageFieldEditor` — ver "Upload de imagem" acima). Diferente daquele componente: sem campo `alt` (`og:image` não carrega texto alternativo em nenhum lugar do schema) e sem botão "Remover imagem" separado — o botão de excluir já faz parte do dropzone. Este campo nunca teve um valor migrado de caminho estático para preservar (era sempre `null`, por nunca ter funcionado antes da correção de QA acima), então nunca existiu o caso de uso que justificaria uma caixa de URL editável ao lado do upload — nem antes desta correção, nem depois. Remover a imagem (via botão do dropzone) limpa o campo (`ogImageUrl: null`) até o próximo "Salvar".

**Extensão de `api-client.ts` nesta tarefa:** `ApiError` passou a carregar também `erros: { campo, mensagem }[] | null` (`null` fora de um `422` com a extensão `erros` do formato uniforme de erro, `docs/API.md` § Autenticação → "Formato de erro uniforme") — necessário para `MetadataPage` mostrar a mensagem de validação real por campo, em vez de só o `message` genérico do topo da resposta. Mudança aditiva e compatível com o uso já existente em `SectionListPage`.

## Consulta e exportação de leads (`painel/tela-leads`)

`apps/admin/src/pages/leads/leads-page.tsx` é a rota `/leads` (URL real `/admin/leads`, dentro de `AdminLayout`): busca `GET /api/admin/leads?from=&to=` (`docs/API.md`) com `apiFetch`, mesmo padrão de `SectionListPage`. A própria API já devolve os leads mais recente primeiro (`LeadsRepository.listarPorPeriodo`, `ORDER BY created_at DESC`) — a tela não reordena nada no cliente.

**Filtro de período:** dois `<input type="date">` (`from`/`to`). Como a API filtra `created_at` (`timestamptz`) por comparação direta e o `<input type="date">` só devolve `"AAAA-MM-DD"`, a tela completa cada limite antes de montar a query string — `from` vira início do dia (`T00:00:00.000Z`) e `to` vira fim do dia (`T23:59:59.999Z`) — para o filtro cobrir o dia inteiro escolhido no seletor dos dois lados, em vez de `to` excluir por engano os leads criados depois da meia-noite UTC daquele dia. Qualquer mudança nos dois campos refaz a busca automaticamente (sem botão "aplicar" separado).

**Exportação CSV — autenticação do download:** `GET /api/admin/leads/export.csv` exige `Authorization: Bearer <jwt>` (`apps/api/src/presentation/leads/leads-admin.controller.ts` não aceita token via query param), mas uma navegação simples do navegador para essa URL (um `<a href>` normal, ou `window.open`) não anexa nenhum cabeçalho customizado — a API responderia `401`. A tela resolve isso buscando o CSV com `fetch` autenticado (`apiFetchTexto`, nova função em `apps/admin/src/lib/api-client.ts`, irmã de `apiFetch` para respostas que não são JSON) e então monta o download no próprio cliente: `Blob` com o texto recebido (`type: 'text/csv;charset=utf-8'`) + `URL.createObjectURL` + um `<a download>` programático clicado via `HTMLElement.click()`, revogando a URL do objeto logo depois. O nome do arquivo inclui o período filtrado (`leads-<from>-a-<to>.csv`) quando algum filtro está ativo, ou `leads.csv` sem filtro algum.

**Exclusão:** o botão "Excluir" de cada linha exige **dois cliques deliberados, confirmados na própria célula** — "Excluir" troca a célula por "Confirmar"/"Cancelar", e só "Confirmar" chama `DELETE /api/admin/leads/:id`. Substituiu um `window.confirm` na tarefa `ajustes/estiliza-painel-admin`: o diálogo nativo tira o foco da tabela e não mostra em qual linha a ação vai cair, exatamente a informação de que quem confirma precisa. A proteção contra o clique único acidental é a mesma, e a chamada de API é idêntica. Trocar o período do filtro descarta uma confirmação pendente, porque a linha que ela apontava pode não existir no resultado novo. a listagem é refeita a partir da API assim que a exclusão é confirmada pelo servidor, então o lead removido nunca reaparece nem depende de o cliente "adivinhar" o novo estado. `DELETE` bem-sucedido devolve `204 No Content` (sem corpo) — `apiFetch` foi ajustado para não tentar fazer `.json()` de uma resposta sem conteúdo (`HTTP_STATUS_SEM_CONTEUDO`), o que quebraria essa chamada (e qualquer outra rota futura que devolva `204`).

Colunas da tabela: nome, e-mail, telefone, CRMV, cidade/UF, especialidade, "já é cliente Virbac" e "deseja contato comercial" (Sim/Não), origem, data de recebimento (`Intl.DateTimeFormat('pt-BR')`) e a ação de excluir — todos os campos de `LeadPersistido` (`docs/API.md` § Leads), na mesma ordem do CSV.

## Gestão de operadores (`ajustes/modulo-operadores`)

`apps/admin/src/pages/operators/operators-page.tsx` é a rota `/operators` (URL real `/admin/operators`): busca `GET /api/admin/operators` (`docs/API.md` § Operadores) com `apiFetch`, mesmo padrão de `LeadsPage`. Quem pode logar no painel — **sem tabela própria no banco**, cada linha da tabela é, integralmente, um usuário do Supabase Auth.

**Formulário de criação** (nome, e-mail, senha inicial) no topo da tela, dentro de um `Card`, inline com a tabela — três campos com `FormField`/`atributosDeCampo` (mesmo padrão de `LoginPage`), o de senha com `autoComplete="new-password"`. O botão "Criar operador" fica desabilitado enquanto algum dos três campos está vazio ou durante o envio ("Criando…"). Erro de validação (`422`, `docs/API.md`) aparece por campo (`FormField` → `erro`) e também como `Notice` com a mensagem geral; sucesso mostra `Notice` de confirmação e limpa o formulário.

**Tabela**: Nome, E-mail, Criado em, Último login ("Nunca acessou" quando `null`) e Ações — datas formatadas com o mesmo `Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })` já usado por `LeadsPage`.

**Remoção — duas recusas antecipadas no cliente**, sem esperar a API responder `409` (`RemoverOperadorUseCase`, `docs/API.md` § Operadores) para o operador descobrir que não pode: o botão "Remover" é substituído por um texto simples com o motivo (sem tooltip) quando
1. só resta 1 operador na lista (`operators.length === 1` → "Único operador restante"), ou
2. a linha é a própria conta logada (`operator.id === session.user.id`, o id do Supabase Auth client-side — `useAuth().session.user.id` → "Sua própria conta").

A checagem de "único operador restante" tem prioridade sobre a de "própria conta": quando só resta 1 operador, ele é necessariamente quem está logado (não há como estar autenticado sendo um operador que não existe mais na listagem), então a informação mais específica das duas é mostrada. Quando nenhuma das duas recusas se aplica, a remoção segue o mesmo padrão de dois cliques de confirmação na própria linha já usado por `LeadsPage`.

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
