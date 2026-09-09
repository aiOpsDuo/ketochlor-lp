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

**`GET /api/content`** devolve `{ "sections": { "<key>": <SectionData> | null, ... }, "metadata": <SiteMetadata> }`. Decisão de formato: as 11 chaves de `SectionKey` estão **sempre presentes** no objeto — uma seção com `is_published = false` aparece com valor `null`, nunca é omitida da resposta. Isso permite a qualquer consumidor (`PublishedContentProvider` da LP, o Injetor de SEO) sempre indexar `sections[key]` diretamente, sem checar presença de chave antes. Cada seção retornada já passou por `filtrarConteudoPublicado` (Domínio): os itens de lista marcados como não visíveis em `item_visibility` são removidos antes de sair da API — nunca vazam para fora, mesmo que a seção esteja publicada. `metadata` (desde a tarefa `api/modulo-metadata`) é sempre o registro único de `site_metadata` tal como persistido — não existe conceito de "metadados não publicados", então, diferente de `sections`, não passa por nenhum filtro de visibilidade.

**`GET /api/admin/sections/:key`** e as duas rotas de escrita devolvem `404` (`{ message, statusCode: 404 }`) se `:key` não for uma das 11 seções fechadas do CMS.

**`PUT /api/admin/sections/:key`** — corpo `{ "data": <objeto>, "itemVisibility"?: { "<campoDaLista>": boolean[] } }`. `data` é validado contra o esquema Zod da seção (`validarConteudoSecao`, Domínio) antes de qualquer gravação:
- Inválido → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — extensão do formato uniforme com a lista de campos inválidos; nenhuma gravação parcial acontece.
- `itemVisibility` omitido preserva o mapa já persistido (não reseta a visibilidade de itens ocultados por um salvamento anterior).
- Sucesso → `200`, devolve o documento completo atualizado; `updatedBy` é preenchido a partir de `request.usuario.sub` (claim `sub` do JWT verificado pelo `AuthGuard`, ver seção "Autenticação" acima) — nunca aceito no corpo da requisição.

**`PATCH /api/admin/sections/:key/visibility`** não tem corpo; inverte `is_published` e devolve o documento atualizado (`200`). `updatedBy` preenchido da mesma forma que `PUT`.

## Metadados (`api/modulo-metadata`)

`apps/api/src/presentation/metadata/`, `apps/api/src/application/metadata/`. Duas rotas, ambas sobre o registro único de `site_metadata`:

| Rota | Autenticação | Descrição |
|---|---|---|
| `GET /api/admin/metadata` | `Bearer <jwt>` | Devolve o registro único (`title`, `description`, `ogImageMediaId`, `updatedAt`, `updatedBy`) tal como persistido. |
| `PUT /api/admin/metadata` | `Bearer <jwt>` | Substitui `title`, `description` e `ogImageMediaId` do registro único. |

**`PUT /api/admin/metadata`** — corpo `{ "title": string, "description": string, "ogImageMediaId": string | null }`. Substituição integral (mesma semântica de "substitui" de `PUT /api/admin/sections/:key` — não há atualização parcial): `title` e `description` são sempre exigidos, nunca opcionais.

**Decisão de validação:** sem esquema Zod compartilhado (`@ketochlor/content-schema` cobre só as 11 seções, não `site_metadata`) e sem `class-validator`/DTO decorado — a validação vive no Domínio (`validarSiteMetadata`, `apps/api/src/domain/metadata/validar-site-metadata.ts`), no mesmo padrão já usado por `validarLead` para o formulário de leads (outro payload sem esquema compartilhado). Motivo: `class-validator` não é dependência de `apps/api` (ver DTOs de conteúdo) e a Apresentação não deve conter regra de negócio (SDD § Camadas e padrão arquitetural) — uma função de validação simples no Domínio resolve sem introduzir biblioteca nova.

- `title`/`description` vazios (ou só espaços em branco) → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — mesmo formato de erro de `PUT /api/admin/sections/:key`.
- `ogImageMediaId` aceita `null` (remove a imagem de compartilhamento) ou uma string (id de `media_assets`); qualquer outro tipo é rejeitado com `422`.
- Sucesso → `200`, devolve o registro atualizado; `updatedBy` preenchido a partir de `request.usuario.sub`, nunca aceito no corpo.

**Reflexo em `GET /api/content`:** `ConsultarConteudoPublicadoUseCase` (módulo `content`) foi estendido para também buscar `site_metadata` via `SiteMetadataRepository` e compor `metadata` na resposta pública — em vez de um caso de uso novo que só compõe outros dois, já que `GET /api/content` já seguia o padrão "1 rota = 1 caso de uso" usado no resto da API (ver comentário de decisão no próprio arquivo). Um `PUT /api/admin/metadata` bem-sucedido reflete imediatamente em `GET /api/content`, sem exigir novo build/deploy — mesma garantia já dada à edição de seções.

## Mídia (`api/modulo-media`)

`apps/api/src/presentation/media/`, `apps/api/src/application/media/`. Uma única rota:

| Rota | Autenticação | Descrição |
|---|---|---|
| `POST /api/admin/media/upload-url` | `Bearer <jwt>` | Emite uma credencial temporária de upload direto ao Supabase Storage e o `id` reservado em `media_assets` que o painel referenciará no documento de seção assim que o upload terminar. |

**A API nunca recebe os bytes do arquivo.** O upload em si vai direto do navegador ao Storage, usando a credencial devolvida por esta rota (SDD § Decisões técnicas e trade-offs — "Upload direto do navegador para o Storage, com credencial temporária emitida pela API"). Fluxo esperado do cliente (painel):

1. `POST /api/admin/media/upload-url` com `{ originalFilename, mimeType }` → recebe `{ mediaAssetId, storagePath, signedUrl, token }`.
2. O painel usa `signedUrl`/`token` com o SDK do Supabase Storage (`client.storage.from(bucket).uploadToSignedUrl(storagePath, token, arquivo)`) para enviar os bytes diretamente ao bucket — sem passar pela API.
3. Só depois que o Storage confirma o upload é que o documento de seção deve referenciar `mediaAssetId` num campo de imagem, e o registro em `media_assets` propriamente dito é criado (`MediaAssetsRepository.criar`, Infraestrutura — método já existente desde `api/infra-supabase-adapters`, mas sem rota HTTP própria nesta tarefa: nenhum contrato do SDD pede um segundo endpoint, e o `PUT` de seção que vai efetivamente consumir esse `mediaAssetId` ainda não existe no painel).

**Corpo de `POST /api/admin/media/upload-url`:** `{ "originalFilename": string, "mimeType": string }`.
- `originalFilename` vazio (ou só espaços em branco) → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — mesmo formato de erro das outras rotas administrativas.
- `mimeType` vazio ou que não comece com `"image/"` (ex.: `video/mp4`) → `422`, mesmo formato — não há suporte a vídeo nesta versão do Ketochlor (PRD § Fora de escopo).
- Sucesso → `201`, corpo `{ "mediaAssetId": string, "storagePath": string, "signedUrl": string, "token": string }`. Nenhuma linha nasce em `media_assets` nesta chamada — só a credencial e o id são reservados (SDD § Riscos técnicos e mitigação — "Upload de imagem interrompido no meio do envio": um upload que falha no meio não deixa nenhuma seção apontando para um arquivo inexistente, porque o registro só existe depois da confirmação).

**Decisão de validação:** mesmo padrão de `validarSiteMetadata`/`validarLead` — sem `class-validator`/DTO decorado, a regra vive no Domínio (`validarSolicitacaoUpload`, `apps/api/src/domain/media/validar-solicitacao-upload.ts`). "Só imagem, sem vídeo" é tratado como regra de negócio do que o CMS aceita como mídia (não uma checagem de forma de payload), por isso vive no Domínio e não num DTO da Apresentação.

## Testes de integração e e2e

Os testes de `apps/api/src/infrastructure` (`npm run test --prefix apps/api -- infra`), o e2e do `AuthGuard` (`presentation/auth/auth.e2e.test.ts`, `npm run test --prefix apps/api -- auth`), o e2e do módulo de conteúdo (`presentation/content/content.e2e.test.ts`, `npm run test --prefix apps/api -- content`), o e2e do módulo de metadados (`presentation/metadata/metadata.e2e.test.ts`, `npm run test --prefix apps/api -- metadata`) e o e2e do módulo de mídia (`presentation/media/media.e2e.test.ts`, `npm run test --prefix apps/api -- media`) rodam contra o Supabase LOCAL de verdade, não mocks do SDK — os e2e sobem a aplicação Nest completa (`AppModule`) via `@nestjs/testing` + `supertest`, com um usuário/login reais (o de mídia inclusive faz um upload real contra o Storage local, com a credencial que a rota devolve):

```bash
npx supabase start   # sobe Postgres/Auth/Storage locais
npm run test --prefix apps/api -- infra     # repositórios + verificador de token
npm run test --prefix apps/api -- auth      # AuthGuard e2e (inclui o teste acima do verificador)
npm run test --prefix apps/api -- content   # módulo de conteúdo e2e (GET /api/content + CRUD de seções)
npm run test --prefix apps/api -- metadata  # módulo de metadados e2e (GET/PUT /api/admin/metadata + reflexo em GET /api/content)
npm run test --prefix apps/api -- media     # módulo de mídia e2e (POST /api/admin/media/upload-url + upload real ao Storage)
npx supabase stop    # não deixe os containers rodando ao final
```

`apps/api/vitest.setup.ts` carrega `apps/api/.env` (via `dotenv`) antes da suíte — só para desenvolvimento/teste local, nunca usado pelo `apps/api/src/main.ts` em produção.
