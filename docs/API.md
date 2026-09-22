# API (`apps/api`)

NestJS 11, camadas Apresentação → Aplicação → Domínio → Infraestrutura (ver [`agent_context/SDD.md` § "Camadas e padrão arquitetural"](../agent_context/SDD.md)). Este documento cobre a configuração necessária para rodar a API, seus testes, a autenticação e as rotas de cada módulo de produto, conforme `api/modulo-content`, `api/modulo-metadata` etc. do [`agent_context/PLAN.md`](../agent_context/PLAN.md) forem concluídas.

## Configuração

Variáveis de ambiente lidas de `process.env`, nunca hardcoded — MySQL (`apps/api/src/infrastructure/config/mysql-env.ts`), MinIO (`.../minio-env.ts`) e auth própria (`.../auth-jwt-env.ts`). Copie `apps/api/.env.example` para `apps/api/.env` (arquivo local, ignorado pelo Git) e ajuste:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MYSQL_HOST` | não (default `mysql`, nome do serviço no compose) | Host do MySQL. `127.0.0.1` para rodar a API fora do compose (ver `apps/api/.env.example`). |
| `MYSQL_PORT` | não (default `3306`) | Porta do MySQL. |
| `MYSQL_DATABASE` | sim | Nome do banco do CMS. |
| `MYSQL_APP_USER` / `MYSQL_APP_PASSWORD` | sim | Usuário de aplicação — só `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`INDEX`, nunca DDL (ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)). É este usuário, nunca `root`, que a API usa em runtime. |
| `MINIO_ENDPOINT` | não (default `http://minio:9000`, ou `MINIO_HOST`/`MINIO_PORT`) | Endpoint do MinIO usado tanto para assinar a URL de upload quanto para montar `public_url` — precisa ser o mesmo endpoint que o navegador alcança, nunca o hostname interno do compose (ver [`docs/BANCO-DE-DADOS.md` § "Bucket MinIO"](./BANCO-DE-DADOS.md) para o motivo completo). |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | sim | Credencial do MinIO usada pelo `S3Client` do servidor. |
| `MINIO_BUCKET` | não (default `images`) | Bucket de imagens do CMS. |
| `AUTH_JWT_SECRET` | sim | Segredo HS256 **próprio da aplicação** (nunca de terceiro) — emite e verifica o JWT de `POST /api/auth/login`. Mínimo de 32 caracteres, validado em `carregarAuthJwtEnv` (lança erro descritivo abaixo do mínimo). |
| `AUTH_JWT_EXPIRES_IN` | não (default `30d`) | Validade do token emitido (formato aceito por `jose`, ex. `"8h"`, `"30d"`). Painel sem refresh token nesta versão (uso interno ocasional, ver SDD § Autenticação) — validade longa é deliberada. |

`apps/api/src/main.ts` carrega `apps/api/.env` sozinho (`import 'dotenv/config'`, primeira linha do arquivo) — basta o arquivo existir para `npm run dev --prefix apps/api` (ou `npm run dev` na raiz) já enxergar as variáveis, sem precisar exportá-las manualmente no shell. Empacotado via Docker/Compose não há `apps/api/.env` na imagem — `docker-compose.yml` injeta as mesmas variáveis diretamente via `environment:` (ver [`docs/DOCKER.md`](./DOCKER.md)), e `dotenv` não sobrescreve uma variável já definida em `process.env` nem lança erro quando o arquivo não existe.

Os valores em `apps/api/.env.example` já vêm preenchidos com defaults de **desenvolvimento** — óbvios, nunca segredo real — para rodar contra o `mysql`/`minio` do `docker-compose.yml` deste repositório. Troque por credenciais reais ao publicar em homologação/produção (`MINIO_ENDPOINT` em particular **precisa** ser sobrescrita com o domínio/IP público real, ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)).

## Autenticação (`ajustes/migracao-mysql-modulo-auth-proprio`)

A API **emite e verifica sua própria sessão** — nenhum serviço de identidade de terceiro está envolvido. `POST /api/auth/login` (público, fora de `/api/admin/*`) recebe `{ email, senha }`, verifica o hash (`bcryptjs`) contra `operators.senha_hash`, grava `ultimo_login_em` e devolve `{ accessToken }`: um JWT assinado (HS256, `AUTH_JWT_SECRET`, via `jose`/`SignJWT`) com `sub = operators.id`.

```
POST /api/auth/login
Content-Type: application/json

{ "email": "operador@exemplo.com", "senha": "..." }
```

| Situação | Resposta |
|---|---|
| `email`/`senha` ausentes ou vazios | `422 Unprocessable Entity`, `{ message, statusCode: 422, erros: [...] }` |
| E-mail não cadastrado, ou senha não confere | `401 Unauthorized`, sempre a MESMA mensagem genérica ("E-mail ou senha inválidos.") — nunca revela qual dos dois aconteceu |
| Sucesso | `200 OK`, `{ accessToken }` |

**Mitigação de ataque de tempo:** quando o e-mail não existe, `LoginUseCase` ainda roda `bcryptjs.compare` contra um hash fixo (`HASH_FALSO_PARA_TIMING_CONSTANTE`, não correspondente a nenhuma conta real) em vez de responder imediatamente — assim "e-mail inexistente" e "senha errada" respondem no mesmo patamar de latência, sem um oráculo de tempo trivial revelando quais e-mails têm conta.

Toda rota sob `/api/admin/*` exige o header obtido acima:

```
Authorization: Bearer <jwt-emitido-por-login>
```

O guard (`apps/api/src/presentation/auth/auth.guard.ts`) intercepta a requisição, extrai o token do header, e chama a porta `VerificadorToken` (Domínio) — implementada por `AppJwtTokenVerificador` (Infraestrutura, `apps/api/src/infrastructure/auth/app-jwt-token-verificador.ts`), que fixa `algorithms: ['HS256']` explicitamente (mitigação de confusão de algoritmo — nunca aceita um token assinado com outro algoritmo mesmo que o header do JWT o declare). Comportamento:

| Situação | Resposta |
|---|---|
| Header `Authorization` ausente, sem prefixo `Bearer `, ou vazio | `401 Unauthorized` |
| Token malformado, com assinatura adulterada, expirado, ou assinado com segredo diferente do configurado | `401 Unauthorized` |
| Token válido | Requisição prossegue; as claims (`sub`, `email`) ficam disponíveis em `request.usuario`, para uso por outros módulos (ex. `updatedBy`/`createdBy` nas escritas de `api/modulo-content`) |

Rotas fora de `/api/admin/*` (ex. `GET /api/health`, `POST /api/auth/login`, `GET /api/content`, `POST /api/leads`) nunca passam pelo guard — nenhum header de autenticação é exigido.

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
| `GET /api/admin/metadata` | `Bearer <jwt>` | Devolve o registro único (`title`, `description`, `ogImageUrl`, `updatedAt`, `updatedBy`) tal como persistido. |
| `PUT /api/admin/metadata` | `Bearer <jwt>` | Substitui `title`, `description` e `ogImageUrl` do registro único. |

**`PUT /api/admin/metadata`** — corpo `{ "title": string, "description": string, "ogImageUrl": string | null }`. Substituição integral (mesma semântica de "substitui" de `PUT /api/admin/sections/:key` — não há atualização parcial): `title` e `description` são sempre exigidos, nunca opcionais.

**Decisão de validação:** sem esquema Zod compartilhado (`@ketochlor/content-schema` cobre só as 11 seções, não `site_metadata`) e sem `class-validator`/DTO decorado — a validação vive no Domínio (`validarSiteMetadata`, `apps/api/src/domain/metadata/validar-site-metadata.ts`), no mesmo padrão já usado por `validarLead` para o formulário de leads (outro payload sem esquema compartilhado). Motivo: `class-validator` não é dependência de `apps/api` (ver DTOs de conteúdo) e a Apresentação não deve conter regra de negócio (SDD § Camadas e padrão arquitetural) — uma função de validação simples no Domínio resolve sem introduzir biblioteca nova.

- `title`/`description` vazios (ou só espaços em branco) → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — mesmo formato de erro de `PUT /api/admin/sections/:key`.
- `ogImageUrl` aceita `null` ou string vazia/só espaços (removem a imagem de compartilhamento) ou uma URL `http(s)://` (validada por `ehUrlHttpValida`, local a `validar-site-metadata.ts`); qualquer outro formato — inclusive um id "cru", o formato antigo do campo — é rejeitado com `422` (`campo: "ogImageUrl"`).
- Sucesso → `200`, devolve o registro atualizado; `updatedBy` preenchido a partir de `request.usuario.sub`, nunca aceito no corpo.

**Correção da tarefa `ajustes/corrige-imagem-metadados` (achado de QA):** o campo se chamava `ogImageMediaId` (coluna `og_image_media_id`, pensada como referência a `media_assets.id`) e aceitava qualquer string como "válida" — mas nenhuma rota da API jamais criava o registro em `media_assets` que esse id deveria referenciar (mesma lacuna de `POST /api/admin/media/upload-url`, ver "Mídia" abaixo), então o campo nunca continha um valor utilizável. Renomeado para `ogImageUrl` (migration `20260910120000_rename_site_metadata_og_image_to_url.sql`, coluna `og_image_url text`) e a validação passou a exigir o formato de URL — a tela de Metadados do painel agora faz upload real (ver `docs/PAINEL.md`) e grava a URL pública devolvida pelo Storage, o mesmo valor que `ogImageUrl` guarda daqui em diante.

**Reflexo em `GET /api/content`:** `ConsultarConteudoPublicadoUseCase` (módulo `content`) foi estendido para também buscar `site_metadata` via `SiteMetadataRepository` e compor `metadata` na resposta pública — em vez de um caso de uso novo que só compõe outros dois, já que `GET /api/content` já seguia o padrão "1 rota = 1 caso de uso" usado no resto da API (ver comentário de decisão no próprio arquivo). Um `PUT /api/admin/metadata` bem-sucedido reflete imediatamente em `GET /api/content`, sem exigir novo build/deploy — mesma garantia já dada à edição de seções.

## Mídia (`api/modulo-media`)

`apps/api/src/presentation/media/`, `apps/api/src/application/media/`. Uma única rota:

| Rota | Autenticação | Descrição |
|---|---|---|
| `POST /api/admin/media/upload-url` | `Bearer <jwt>` | Emite uma credencial temporária (URL S3 pré-assinada) de upload direto ao MinIO e o `id` reservado em `media_assets` que o painel referenciará no documento de seção assim que o upload terminar. |

**A API nunca recebe os bytes do arquivo.** O upload em si vai direto do navegador ao MinIO, usando a credencial devolvida por esta rota (SDD § Decisões técnicas e trade-offs — "Upload direto do navegador para o Storage, com credencial temporária emitida pela API"). Implementado por `MinioMediaAssetsRepository` (`apps/api/src/infrastructure/minio/media-assets.repository.ts`, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`). Fluxo esperado do cliente (painel):

1. `POST /api/admin/media/upload-url` com `{ originalFilename, mimeType }` → recebe `{ mediaAssetId, storagePath, signedUrl, token }`.
2. O painel (`apps/admin/src/lib/media-upload.ts`, `enviarImagemParaStorage`) faz um `PUT` HTTP simples direto contra `signedUrl`, com o arquivo como corpo — padrão de upload S3 pré-assinado, sem SDK cliente no navegador.
3. `MediaAssetsRepository.criar` (Infraestrutura) é o método que confirmaria o registro em `media_assets` após o upload, mas não tem rota HTTP própria — nenhum contrato do SDD pede um segundo endpoint para isso. Na prática, o painel nunca chama esse método: ele deriva a URL pública a partir da própria `signedUrl` (removendo a query string de assinatura) e grava-a direto no campo `{ url, alt }` da seção (`imageFieldSchema`, `@ketochlor/content-schema`), sem referenciar `mediaAssetId` em lugar nenhum do `PUT /api/admin/sections/:key`. Consequência: a imagem funciona normalmente na LP (o bucket tem policy de leitura pública só de objeto, ver [`docs/BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)), mas nenhuma linha nasce em `media_assets` para os uploads feitos pelo painel — falta só a contabilidade/auditoria, não a funcionalidade (lacuna conhecida, pré-existente à migração de plataforma de dados, documentada em `docs/PAINEL.md`).

**`token` é sempre `null`** no corpo de sucesso desta rota (ver abaixo) — decisão documentada na porta `MediaAssetsRepository`: uma URL pré-assinada S3 já embute toda a autenticação necessária na própria URL (query string assinada), então não existe um token separado a devolver (diferente do antigo par `signedUrl`/`token` do Supabase Storage). O campo permanece no contrato só por compatibilidade de forma.

**Corpo de `POST /api/admin/media/upload-url`:** `{ "originalFilename": string, "mimeType": string }`.
- `originalFilename` vazio (ou só espaços em branco) → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — mesmo formato de erro das outras rotas administrativas.
- `mimeType` vazio ou que não comece com `"image/"` (ex.: `video/mp4`) → `422`, mesmo formato — não há suporte a vídeo nesta versão do Ketochlor (PRD § Fora de escopo).
- Sucesso → `201`, corpo `{ "mediaAssetId": string, "storagePath": string, "signedUrl": string, "token": null }`. Nenhuma linha nasce em `media_assets` nesta chamada — só a credencial e o id são reservados (SDD § Riscos técnicos e mitigação — "Upload de imagem interrompido no meio do envio": um upload que falha no meio não deixa nenhuma seção apontando para um arquivo inexistente, porque o registro só existe depois da confirmação).

**Decisão de validação:** mesmo padrão de `validarSiteMetadata`/`validarLead` — sem `class-validator`/DTO decorado, a regra vive no Domínio (`validarSolicitacaoUpload`, `apps/api/src/domain/media/validar-solicitacao-upload.ts`). "Só imagem, sem vídeo" é tratado como regra de negócio do que o CMS aceita como mídia (não uma checagem de forma de payload), por isso vive no Domínio e não num DTO da Apresentação.

## Leads (`api/modulo-leads`)

`apps/api/src/presentation/leads/`, `apps/api/src/application/leads/`. Última tarefa da fase `api`. Quatro rotas:

| Rota | Autenticação | Descrição |
|---|---|---|
| `POST /api/leads` | pública | Recebe o envio do formulário de Material Técnico da LP e cria um registro em `leads`. |
| `GET /api/admin/leads?from=&to=` | `Bearer <jwt>` | Lista todos os leads, mais recente primeiro, com filtro de período opcional. |
| `GET /api/admin/leads/export.csv?from=&to=` | `Bearer <jwt>` | Mesma listagem/filtro acima, formatada como CSV. |
| `DELETE /api/admin/leads/:id` | `Bearer <jwt>` | Exclui um lead permanentemente. |

**`POST /api/leads`** — corpo `{ "nome": string, "email": string, "telefone"?: string, "crmv"?: string, "estadoCidade"?: string, "especialidade"?: string, "jaClienteVirbac"?: boolean, "desejaContatoComercial"?: boolean, "origem"?: string, "consentimentoAceito": boolean }`. Fica fora de `/api/admin/*` de propósito (mesmo raciocínio de `GET /api/content`): o `AuthGuard` global só exige token para caminhos sob `/api/admin`, então esta rota nunca pede `Authorization` — confirmado por teste e2e (`leads.e2e.test.ts`), não presumido.
- `nome`/`email` vazios, `email` com formato inválido, ou `consentimentoAceito` diferente de `true` → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [...] }` — mesmo formato de erro das outras rotas; nenhum registro é criado (`validarLead`, Domínio, é a única porta de entrada para a tabela `leads`).
- Sucesso → `201`, devolve o lead criado. **`consentimentoAceito` nunca aparece na resposta nem é persistido** — é condição de envio, não um dado do lead (PRD § Compliance/LGPD: "a prova de consentimento é a própria existência do registro somado a `created_at`", SDD § Modelo de dados). `validarLead` remove o campo do payload antes de qualquer gravação.

**`GET /api/admin/leads`** devolve a listagem **completa** (não paginada) filtrada por período, mais recente primeiro. Decisão de escopo: o SDD descreve "lista paginada", mas a porta `LeadsRepository.listarPorPeriodo` (Domínio/Infraestrutura, `api/infra-supabase-adapters`) não aceita parâmetros de paginação — só o filtro de período — e o volume de leads declarado no PRD (dezenas de edições/poucos usuários) não justifica introduzir paginação numa porta que não a tem só para esta rota; se o volume real de leads crescer a ponto de a listagem completa pesar, paginação é uma extensão futura da porta, não algo a antecipar aqui (proporcionalidade, `references/padroes-codigo.md`). `from`/`to` são datas ISO 8601 (`Date.parse` válido); um valor presente e inválido é recusado com `400 Bad Request` antes de alcançar o banco.

**`GET /api/admin/leads/export.csv`** aplica o mesmo filtro/listagem do endpoint acima e devolve `Content-Type: text/csv; charset=utf-8`: uma linha de cabeçalho (`id,nome,email,telefone,crmv,estadoCidade,especialidade,jaClienteVirbac,desejaContatoComercial,origem,createdAt`) seguida de uma linha por lead, campos separados por vírgula e escapados conforme RFC 4180 (aspas duplas ao redor de qualquer valor com vírgula/aspas/quebra de linha). **Decisão de implementação:** formatação própria (`formatarLeadsParaCsv`, `apps/api/src/application/leads/formatar-leads-csv.ts`), sem biblioteca externa — o formato de saída é fixo e conhecido (as colunas de `LeadPersistido`, sem aninhamento, sem necessidade de parsing de volta), então uma função pura de poucas linhas cobre RFC 4180 por completo sem adicionar uma dependência nova a `apps/api` só para "escrever vírgula/aspas com segurança".

**`DELETE /api/admin/leads/:id`** exclui o registro e devolve `204 No Content`; `404 Not Found` se `id` não corresponde a nenhum lead. Decisão de implementação: a porta `LeadsRepository.excluir` devolve `boolean` (havia registro e foi removido, ou não) em vez de `void` — `MySqlLeadsRepository` (`apps/api/src/infrastructure/mysql/leads.repository.ts`) usa `resultado.affectedRows > 0` do próprio `DELETE` (`ResultSetHeader` do `mysql2`) para saber isso, sem exigir uma consulta de leitura extra antes de excluir.

## Operadores (`ajustes/modulo-operadores`, adaptador trocado em `ajustes/migracao-mysql-modulo-auth-proprio`)

`apps/api/src/presentation/operators/`, `apps/api/src/application/operators/`. Gestão de quem pode logar no painel administrativo. **Tabela própria no MySQL** (`operators`, ver [`docs/BANCO-DE-DADOS.md` § Modelo de dados](./BANCO-DE-DADOS.md)) — desde a migração de plataforma de dados, um "operador" não é mais um usuário de um serviço de identidade de terceiro: `MySqlOperadoresRepository` implementa as três operações abaixo direto contra a tabela `operators`, com `senha_hash` gerado por `bcryptjs` (nunca a senha em texto plano). Três rotas:

| Rota | Autenticação | Descrição |
|---|---|---|
| `GET /api/admin/operators` | `Bearer <jwt>` | Lista todos os operadores, mais recente primeiro (`criado_em DESC`). |
| `POST /api/admin/operators` | `Bearer <jwt>` | Cria um novo operador, já pronto para logar. |
| `DELETE /api/admin/operators/:id` | `Bearer <jwt>` | Remove um operador permanentemente. |

**`GET /api/admin/operators`** devolve `{ id, email, nome, criadoEm, ultimoLoginEm }[]`. `ultimoLoginEm` é `null` até o primeiro `POST /api/auth/login` bem-sucedido dessa conta (gravado por `MySqlOperadoresRepository.atualizarUltimoLogin`).

**`POST /api/admin/operators`** — corpo `{ "email": string, "senha": string, "nome": string }`.
- `nome`/`email` vazios, `email` com formato inválido, ou `senha` com menos de 6 caracteres → `422 Unprocessable Entity`, corpo `{ "message": string, "statusCode": 422, "erros": [{ "campo": string, "mensagem": string }, ...] }` — mesmo formato de erro das outras rotas administrativas; nenhuma conta é criada (`validarCriacaoOperador`, Domínio, é a única porta de entrada).
- Sucesso → `201`, devolve o operador criado. **A conta nasce pronta para logar** — sem link nem e-mail de confirmação (o módulo novo não envia e-mail); quem cria um operador pelo painel entrega a senha inicial a essa pessoa por fora.

**`DELETE /api/admin/operators/:id`** exclui o registro de `operators` e devolve `204 No Content`. Duas invariantes são checadas ANTES da exclusão — as duas travariam o próprio acesso administrativo ao painel — e respondem `409 Conflict` (`ConflictException`, mesmo padrão de captura de erro de domínio já usado em `ContentAdminController` para `ChaveSecaoInvalidaError`):
- **Própria conta**: `:id` é igual ao id do operador do token (`request.usuario.sub`) → `409`, `{ "message": "Você não pode remover a própria conta." }`.
- **Último operador restante**: só existe 1 operador no total → `409`, `{ "message": "Não é possível remover o único operador restante." }`. Na prática, este ramo é inatingível via chamada HTTP real: quem chama só tem um JWT válido se é, ele mesmo, um operador existente, então uma lista de tamanho 1 nunca contém um alvo diferente de quem chama — o caso "própria conta" sempre intercepta primeiro. A checagem é mantida como defesa em profundidade (`RemoverOperadorUseCase`, Aplicação) e coberta isoladamente por um teste de unidade com um repositório falso (`remover-operador.use-case.test.ts`, reexecutado nesta revisão: 4/4 passam), já que o e2e real não consegue construir esse estado sem apagar os demais operadores da tabela `operators` compartilhada.
- `:id` que não corresponde a nenhum operador existente → `404 Not Found`.

## Injetor de SEO (`seo/injetor-metadados`)

`GET /api/content` (acima) é a fonte de `metadata` tanto para a LP em runtime quanto para o Injetor de SEO — mas o Injetor **não chama essa rota diretamente em produção**. Ele roda como script de build da LP (`apps/lp/scripts/injetar-metadados.mjs`, hook `postbuild` de `apps/lp/package.json`, depois de `vite build`): reaproveita o mesmo `apps/lp/src/content/content-snapshot.json` que o `prebuild` (Instantâneo de conteúdo) já gerou a partir de uma chamada real a `GET /api/content`, e reescreve `apps/lp/dist/index.html`, substituindo (ou inserindo, se ausente) `<title>`, `<meta name="description">` e `<meta property="og:image">` com `metadata.title`/`metadata.description`/`metadata.ogImageUrl`.

**Por que build-time, não uma função de borda por requisição:** o `agent_context/SDD.md` original descrevia essa peça (T2) como "função de borda da plataforma de hospedagem escolhida na implantação" — decisão adiada, sem plataforma escolhida. Confirmado via documentação oficial do nginx que `sub_filter` (`ngx_http_sub_module`, único proxy que o projeto de fato usa hoje — `docker/nginx.conf`) não suporta buscar um valor de uma chamada de rede feita durante o processamento da resposta (só substitui por strings/variáveis do próprio nginx); isso exigiria `njs`/`ngx_http_js_module` (subrequest assíncrona dentro de um handler JS) ou uma função de borda real de alguma plataforma de hospedagem — nenhuma das duas presente neste projeto. A injeção em tempo de build cumpre o critério de aceitação literal (HTML da primeira resposta, sem JavaScript, verificável com `curl`) sem essa dependência nova; o trade-off é que o HTML só reflete uma mudança de metadados depois de um novo `npm run build --prefix apps/lp` + deploy, não imediatamente após salvar no painel. Decisão completa e alternativas descartadas em `agent_context/SDD.md` § "Decisões técnicas e trade-offs"; risco registrado em § "Riscos técnicos e mitigação".

**`og:image` (corrigido pela tarefa `ajustes/corrige-imagem-metadados`):** `metadata.ogImageUrl` já chega como a URL pública pronta para uso (ou `null`) — não mais um `uuid` de `media_assets` sem resolução (limitação original, ver `docs/API.md` § Metadados). O script mantém, ainda assim, a mesma checagem defensiva de formato (`ehUrlAbsolutaHttp`, só aceita URL absoluta `http(s)://`) por o `content-snapshot.json` ser uma superfície de confiança um degrau abaixo do domínio da API que já valida o formato em `PUT /api/admin/metadata` — um valor fora do formato esperado é ignorado (mantém o default do `index.html`) em vez de gravar uma tag quebrada. `title`/`description` não têm essa checagem: já chegam como texto pronto para uso, sem formato a validar.

**Comportamento defensivo:** o script nunca falha o build — instantâneo ausente/ilegível, ou `metadata` com campos vazios/ausentes, apenas preservam o `index.html` como o `vite build` o gerou (mesmo padrão de resiliência do `prebuild`/Instantâneo de conteúdo). Testes: `npm run test --prefix apps/lp -- injetar-metadados`.

**Como verificar manualmente** (sem depender de uma plataforma de borda):
```bash
npm run build --prefix apps/lp   # prebuild (instantâneo) → vite build → postbuild (injetor)
grep -E "<title>|meta name=\"description\"|og:image" apps/lp/dist/index.html
```
Ou servindo o `dist/` gerado atrás do mesmo `docker/nginx.conf` usado em produção (LP pública, sem precisar do serviço `api` de pé):
```bash
docker run --rm -d -p 8092:80 \
  -v "$(pwd)/apps/lp/dist:/usr/share/nginx/html:ro" \
  -v "$(pwd)/docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:1.27-alpine
curl -s http://localhost:8092/   # título/descrição/og:image reais, sem executar JavaScript
```

## Testes de integração e e2e

Os testes de `apps/api/src/infrastructure` (`npm run test --prefix apps/api -- infra`, cobrindo os repositórios MySQL, `MinioMediaAssetsRepository` e `AppJwtTokenVerificador`), o e2e de login (`presentation/auth/auth-login.e2e.test.ts`, `npm run test --prefix apps/api -- auth`, cobre `POST /api/auth/login` **e** o `AuthGuard` de rotas administrativas com o token que ele emite), o e2e do módulo de conteúdo (`presentation/content/content.e2e.test.ts`, `npm run test --prefix apps/api -- content`), o e2e do módulo de metadados (`presentation/metadata/metadata.e2e.test.ts`, `npm run test --prefix apps/api -- metadata`), o e2e do módulo de mídia (`presentation/media/media.e2e.test.ts`, `npm run test --prefix apps/api -- media`), o e2e do módulo de leads (`presentation/leads/leads.e2e.test.ts`, `npm run test --prefix apps/api -- leads`) e o e2e do módulo de operadores (`presentation/operators/operators.e2e.test.ts`, `npm run test --prefix apps/api -- operators`) rodam contra o `mysql`/`minio` REAIS do `docker-compose.yml`, não mocks — os e2e sobem a aplicação Nest completa (`AppModule`) via `@nestjs/testing` + `supertest`, criando um operador real via `MySqlOperadoresRepository` e autenticando via `POST /api/auth/login` (o de mídia inclusive faz um upload real contra o MinIO local, com a credencial que a rota devolve). O ramo "último operador restante" de `RemoverOperadorUseCase` é coberto à parte, por um teste de unidade com repositório falso (`application/operators/remover-operador.use-case.test.ts`, `npm run test --prefix apps/api -- remover-operador`) — ver "Operadores" acima para o motivo de não ser alcançável via e2e real:

```bash
docker compose up -d mysql minio minio-init   # sobe MySQL/MinIO locais
npm run migrate:mysql --prefix apps/api       # schema aplicado (idempotente)
npm run test --prefix apps/api -- infra     # repositórios MySQL/MinIO + verificador/emissor de token
npm run test --prefix apps/api -- auth      # login (POST /api/auth/login) + AuthGuard e2e
npm run test --prefix apps/api -- content   # módulo de conteúdo e2e (GET /api/content + CRUD de seções)
npm run test --prefix apps/api -- metadata  # módulo de metadados e2e (GET/PUT /api/admin/metadata + reflexo em GET /api/content)
npm run test --prefix apps/api -- media     # módulo de mídia e2e (POST /api/admin/media/upload-url + upload real ao MinIO)
npm run test --prefix apps/api -- leads     # módulo de leads e2e (POST /api/leads público + GET/DELETE /api/admin/leads*)
npm run test --prefix apps/api -- operators # módulo de operadores e2e (GET/POST/DELETE /api/admin/operators*)
docker compose down    # não deixe os containers rodando ao final (ou `down -v` para também limpar os volumes)
```

`apps/api/vitest.setup.ts` carrega `apps/api/.env` (via `dotenv`) antes da suíte, mesmo mecanismo já usado por `apps/api/src/main.ts` (ver "Configuração" acima) — só para desenvolvimento/teste local; empacotado via Docker/Compose não existe `apps/api/.env`, as variáveis chegam via `docker-compose.yml`.
