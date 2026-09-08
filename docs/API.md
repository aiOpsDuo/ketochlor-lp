# API (`apps/api`)

NestJS 11, camadas Apresentação → Aplicação → Domínio → Infraestrutura (ver [`agent_context/SDD.md` § "Camadas e padrão arquitetural"](../agent_context/SDD.md)). Este documento cobre a configuração necessária para rodar a API, seus testes, a autenticação e as rotas de cada módulo de produto, conforme `api/modulo-content`, `api/modulo-metadata` etc. do [`agent_context/PLAN.md`](../agent_context/PLAN.md) forem concluídas.

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

## Autenticação (`api/modulo-auth`)

A API **não implementa login** — o painel administrativo autentica diretamente contra o Supabase Auth (e-mail/senha) e guarda a sessão do lado do cliente; a API só **verifica** o token que o painel já obteve (SDD § Contratos de dados/API/interfaces → Autenticação).

Toda rota sob `/api/admin/*` exige o header:

```
Authorization: Bearer <jwt-do-supabase-auth>
```

O guard (`apps/api/src/presentation/auth/auth.guard.ts`) intercepta a requisição, extrai o token do header, e chama a porta `VerificadorToken` (Domínio) — implementada por `JwksTokenVerificador` (Infraestrutura, híbrido HS256/JWKS conforme `SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL`, ver seção "Configuração" acima). Comportamento:

| Situação | Resposta |
|---|---|
| Header `Authorization` ausente, sem prefixo `Bearer `, ou vazio | `401 Unauthorized` |
| Token malformado, com assinatura adulterada, expirado, ou assinado com chave/segredo diferente do configurado | `401 Unauthorized` |
| Token válido | Requisição prossegue; as claims do usuário (`sub`, `email`, `role`, ...) ficam disponíveis em `request.usuario`, para uso por outros módulos (ex. `updatedBy`/`createdBy` nas escritas de `api/modulo-content`) |

Rotas fora de `/api/admin/*` (ex. `GET /api/health`) nunca passam pelo guard — nenhum header de autenticação é exigido.

**Decisão de design:** o guard é registrado GLOBALMENTE (`APP_GUARD`, em `apps/api/src/presentation/auth/auth.module.ts`) e decide sozinho, a partir do caminho da requisição, se exige token — em vez de exigir `@UseGuards(AuthGuard)` explícito em cada controller novo. O NestJS não oferece uma forma nativa de vincular um `CanActivate` a um prefixo de rota (só a controller/handler ou globalmente); vincular por controller seria esquecível — qualquer módulo de admin novo (`api/modulo-content`, `api/modulo-metadata`, `api/modulo-media`, `api/modulo-leads`) que esqueça a anotação ficaria desprotegido por padrão. Com o guard global, toda rota registrada sob `/api/admin/*`, em qualquer controller/módulo futuro, fica protegida automaticamente — "seguro por padrão".

O controller de exemplo `GET /api/admin/ping`, criado só para provar o guard de ponta a ponta na tarefa `api/modulo-auth`, foi removido assim que o primeiro módulo real de admin (`api/modulo-content`, abaixo) passou a existir — o e2e do guard (`presentation/auth/auth.e2e.test.ts`) hoje exercita `GET /api/admin/sections` em seu lugar.

**Formato de erro uniforme** (SDD § Contratos de dados/API/interfaces): toda resposta de erro de qualquer rota da API tem, no mínimo, `{ "message": string, "statusCode": number }` — o padrão de exceções HTTP do NestJS. Algumas rotas estendem esse formato com campos adicionais quando fazem sentido (ex.: `erros` na validação de `PUT /api/admin/sections/:key`, abaixo) — a extensão nunca remove `message`/`statusCode`.

## Conteúdo (`api/modulo-content`)

Primeiro módulo real de produto da API (`apps/api/src/presentation/content/`, `apps/api/src/application/content/`). Cinco rotas:

| Rota | Autenticação | Descrição |
|---|---|---|
| `GET /api/content` | pública | Conteúdo publicado das 11 seções, para a LP e para o Injetor de SEO. |
| `GET /api/admin/sections` | `Bearer <jwt>` | Lista resumida das 11 seções (`key`, `isPublished`, `updatedAt`), na ordem declarada em `@ketochlor/content-schema` — tela de listagem do painel. |
| `GET /api/admin/sections/:key` | `Bearer <jwt>` | Documento completo de uma seção (`data`, `itemVisibility`, `isPublished`, `updatedAt`, `updatedBy`), incluindo itens não publicados — tela de edição. |
| `PUT /api/admin/sections/:key` | `Bearer <jwt>` | Substitui `data` (e, opcionalmente, `itemVisibility`) da seção. |
| `PATCH /api/admin/sections/:key/visibility` | `Bearer <jwt>` | Alterna `isPublished` da seção inteira. |

**`GET /api/content`** devolve `{ "sections": { "<key>": <SectionData> | null, ... } }`. Decisão de formato: as 11 chaves de `SectionKey` estão **sempre presentes** no objeto — uma seção com `is_published = false` aparece com valor `null`, nunca é omitida da resposta. Isso permite a qualquer consumidor (`PublishedContentProvider` da LP, o Injetor de SEO) sempre indexar `sections[key]` diretamente, sem checar presença de chave antes. Cada seção retornada já passou por `filtrarConteudoPublicado` (Domínio): os itens de lista marcados como não visíveis em `item_visibility` são removidos antes de sair da API — nunca vazam para fora, mesmo que a seção esteja publicada.

**`GET /api/admin/sections/:key`** e as duas rotas de escrita devolvem `404` (`{ message, statusCode: 404 }`) se `:key` não for uma das 11 seções fechadas do CMS.

**`PUT /api/admin/sections/:key`** — corpo `{ "data": <objeto>, "itemVisibility"?: { "<campoDaLista>": boolean[] } }`. `data` é validado contra o esquema Zod da seção (`validarConteudoSecao`, Domínio) antes de qualquer gravação:
- Inválido → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — extensão do formato uniforme com a lista de campos inválidos; nenhuma gravação parcial acontece.
- `itemVisibility` omitido preserva o mapa já persistido (não reseta a visibilidade de itens ocultados por um salvamento anterior).
- Sucesso → `200`, devolve o documento completo atualizado; `updatedBy` é preenchido a partir de `request.usuario.sub` (claim `sub` do JWT verificado pelo `AuthGuard`, ver seção "Autenticação" acima) — nunca aceito no corpo da requisição.

**`PATCH /api/admin/sections/:key/visibility`** não tem corpo; inverte `is_published` e devolve o documento atualizado (`200`). `updatedBy` preenchido da mesma forma que `PUT`.

## Testes de integração e e2e

Os testes de `apps/api/src/infrastructure` (`npm run test --prefix apps/api -- infra`), o e2e do `AuthGuard` (`presentation/auth/auth.e2e.test.ts`, `npm run test --prefix apps/api -- auth`) e o e2e do módulo de conteúdo (`presentation/content/content.e2e.test.ts`, `npm run test --prefix apps/api -- content`) rodam contra o Supabase LOCAL de verdade, não mocks do SDK — os e2e sobem a aplicação Nest completa (`AppModule`) via `@nestjs/testing` + `supertest`, com um usuário/login reais:

```bash
npx supabase start   # sobe Postgres/Auth/Storage locais
npm run test --prefix apps/api -- infra     # repositórios + verificador de token
npm run test --prefix apps/api -- auth      # AuthGuard e2e (inclui o teste acima do verificador)
npm run test --prefix apps/api -- content   # módulo de conteúdo e2e (GET /api/content + CRUD de seções)
npx supabase stop    # não deixe os containers rodando ao final
```

`apps/api/vitest.setup.ts` carrega `apps/api/.env` (via `dotenv`) antes da suíte — só para desenvolvimento/teste local, nunca usado pelo `apps/api/src/main.ts` em produção.
