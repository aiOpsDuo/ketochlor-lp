# Conteúdo da LP e esquemas de seção

O conteúdo das 11 seções da LP (ver [`agent_context/SDD.md` § "Linguagem ubíqua"](../agent_context/SDD.md) para a lista fechada e a definição de "Seção") tem uma fonte única de esquema e tipos: o pacote [`@ketochlor/content-schema`](../packages/content-schema). É esse pacote que a API valida contra (`PUT /api/admin/sections/:key`), o painel usa para gerar o formulário de edição, e a LP usa para tipar o conteúdo que renderiza — a mesma mudança de campo se propaga aos três sem duplicação.

## Onde vivem os esquemas

```
packages/content-schema/src/
├── shared.ts              # ImageField — { url, alt }, comum a toda seção com imagem
├── sections/
│   ├── hero.ts             # schema Zod + tipo + conteúdo inicial da seção `hero`
│   ├── problema.ts
│   ├── fenotipos.ts
│   ├── mecanismo.ts
│   ├── tecnologia_sis.ts
│   ├── prova_autoridade.ts
│   ├── protocolo.ts
│   ├── diferenciais.ts
│   ├── material_tecnico.ts
│   ├── cta_secundario.ts
│   └── faq.ts
└── index.ts                # CONTENT_SECTIONS — registro das 11 seções: { schema, initialContent }
```

Cada arquivo de `sections/` segue o mesmo padrão: um schema [Zod](https://zod.dev/) (`z.object({...})`), o tipo TypeScript inferido dele (`z.infer<typeof algumaCoisaSchema>`) e o conteúdo inicial daquela seção, migrado literalmente de `apps/lp/src/data/content.ts` (mesmo texto, mesmas referências bibliográficas, mesma tabela de dosagem — nenhuma copy foi reescrita nessa migração).

## Como adicionar um campo novo a uma seção existente

1. Abra `packages/content-schema/src/sections/<secao>.ts`.
2. Adicione o campo ao `z.object({...})` daquela seção (ex.: `novoCampo: z.string().min(1)`).
3. Preencha o mesmo campo no objeto `<secao>InitialContent`, logo abaixo — o TypeScript recusa o build se o conteúdo inicial não satisfizer o schema que você acabou de mudar.
4. Rode `npm run test --prefix packages/content-schema` — o teste de "o conteúdo inicial migrado satisfaz o próprio schema" (`src/index.test.ts`) falha imediatamente se o passo 3 for esquecido.
5. Rode `npm run build --prefix packages/content-schema` para confirmar que o pacote builda e gera os tipos atualizados em `dist/`.

Nenhuma mudança em `apps/api` ou `apps/admin` é necessária só para o campo existir no esquema — a validação da API e o formulário do painel leem `CONTENT_SECTIONS` deste pacote (tarefas `api/dominio-esquemas-e-regras` e `painel/formulario-edicao-secao` do `agent_context/PLAN.md`); cada um consome o campo novo quando for atualizado para lê-lo.

## Listas e subestruturas fixas

- **Item de lista** (cardinalidade variável — pode ser adicionado/removido/reordenado pelo painel): as estatísticas de `prova_autoridade`, as linhas de dosagem de `protocolo`, os itens de `diferenciais`, as perguntas de `faq`. Modelados como `z.array(algumSchema).min(1)`.
- **Subestrutura fixa** (cardinalidade fechada — editável, mas sem opção de adicionar/remover no painel): os dois fenótipos de `fenotipos` (`agudo`/`cronico`) e as duas colunas de ativo de `mecanismo` (`cetoconazol`/`clorexidina`). Modeladas como campos nomeados fixos no `z.object`, nunca como array — é essa diferença de forma que impede o painel de oferecer um botão de "adicionar" onde o PRD não permite.

## Campos de imagem

Toda seção com imagem usa o mesmo formato, `imageFieldSchema` (`packages/content-schema/src/shared.ts`): `{ url: string, alt: string }`, com `alt` sempre obrigatório (nunca é possível salvar uma imagem sem texto alternativo). Nesta fase do projeto `url` é só uma string (caminho relativo aos assets estáticos hoje, URL do Storage quando o upload existir) — não há ainda um campo `mediaId` apontando para `media_assets.id`, porque essa tabela e o fluxo de upload (`api/modulo-media`) ainda não existem; adicionar o campo antes disso seria uma referência que nada preenche. Quando `api/modulo-media` for implementada, este arquivo e o schema serão atualizados juntos.

## Seção `hero` — nota sobre a imagem `selo`

`hero` tem três imagens no esquema (`logo`, `imagemCampanha`, `selo`), conforme a forma normativa do SDD. `apps/lp/src/components/Hero.tsx` lê as três de `usePublishedContent()`, mas renderiza apenas `logo` e `imagemCampanha`; o bloco de `selo` permanece como um `<img>` comentado (mesmo arquivo de imagem já usado pela seção `prova_autoridade`), preservando a renderização visual que a LP já tinha antes da migração (`lp/migrar-secoes-para-cms`) — o campo existe no esquema e é editável no painel, mas hoje não aparece na LP.

## Instantâneo de conteúdo

`apps/lp/src/content/content-snapshot.json` **não é editado à mão**. Ele é gerado por `apps/lp/scripts/gerar-instantaneo-de-conteudo.mjs`, rodado automaticamente como `prebuild` antes de `npm run build --prefix apps/lp` (também disponível como `npm run instantaneo --prefix apps/lp`, para gerar sob demanda sem rodar o build inteiro).

O script faz uma chamada real a `GET /api/content` (URL configurável via `CONTENT_SNAPSHOT_API_URL`, default `http://localhost:3000/api/content` — o endereço direto de `apps/api` em desenvolvimento, mesma porta padrão de `apps/api/src/main.ts`) e grava a resposta, formatada com indentação, em `content-snapshot.json`. `PublishedContentProvider.tsx` (`lp/provider-conteudo-publicado`) importa esse arquivo estaticamente e o usa como conteúdo de reserva quando `GET /api/content` falha em runtime (SDD § Riscos técnicos — "API indisponível derrubando a LP").

**Falha da API no momento do build nunca derruba o build nem trava**: se a chamada falhar (rede indisponível, timeout, status de erro, corpo que não é JSON, ou uma resposta que não tem a forma exata de `GET /api/content` — as 11 chaves de seção de `@ketochlor/content-schema` presentes em `sections`) o script avisa claramente no console (`AVISO: ...`) e mantém o `content-snapshot.json` já existente no repositório, sem sobrescrevê-lo com um arquivo vazio ou quebrado. A checagem das 11 chaves (não só "é um objeto com `sections`/`metadata`") existe especificamente para o caso de `CONTENT_SNAPSHOT_API_URL` apontar, por engano ou colisão de porta, para outro serviço qualquer que devolva algo com essa forma de topo mas conteúdo de outro produto — sem essa checagem, esse conteúdo estranho seria aceito e quebraria o build da LP (erro de tipo, silencioso até o `tsc -b` reclamar).

## Seção `faq` — nota sobre `eyebrow`/`heading`

O antigo `FAQS` de `apps/lp/src/data/content.ts` era só a lista de perguntas; o texto "FAQ TÉCNICO" / "Perguntas frequentes" estava fixo dentro do JSX de `apps/lp/src/components/FAQ.tsx`. Para fechar a seção com a mesma forma das outras 10 (eyebrow + heading), esses dois textos foram migrados literalmente do componente para o conteúdo inicial de `faq`, e a tarefa `lp/migrar-secoes-para-cms` trocou o texto hardcoded do componente pela leitura de `usePublishedContent().sections.faq`.
