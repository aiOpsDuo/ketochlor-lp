# Domínio

Esquemas de seção, regras de validação de conteúdo, regras de visibilidade, invariantes do lead. Sem nenhum import de framework ou de Supabase (ver SDD § Camadas e padrão arquitetural).

Populado pela tarefa `api/dominio-esquemas-e-regras` (`agent_context/PLAN.md`), em três módulos independentes (Single Responsibility — cada um seu próprio motivo de mudar):

- **`content/`** — `validarConteudoSecao(key, data)` reaproveita o registro `CONTENT_SECTIONS` de `@ketochlor/content-schema` para validar o `data` bruto de uma seção contra o esquema Zod correspondente. Devolve um `ResultadoValidacao` (sucesso + dado tipado, ou lista de `erros`); nunca lança exceção para "dado inválido" — só lança `ChaveSecaoInvalidaError` (erro de domínio, não HTTP) quando `key` não é uma das 11 seções fechadas.
- **`visibilidade/`** — `filtrarConteudoPublicado(secao, itemVisibilityFlags)`, função pura usada pela futura rota pública `GET /api/content`: devolve `null` se a seção inteira não está publicada, e filtra os itens de lista marcados como não visíveis. A visibilidade de item é modelada como metadado que a API guarda **por cima** do `data` já validado (um mapa `{ campoDaLista: boolean[] }`), não como campo dentro do próprio conteúdo — ver a nota de decisão no topo de `visibilidade/filtrar-conteudo-publicado.ts` para o porquê (schema de `content-schema` já fechado nesta versão + `z.object()` no modo "strip" descartaria o campo silenciosamente).
- **`leads/`** — `validarLead(payload)` aplica as invariantes do lead (nome/e-mail obrigatórios e não vazios, e-mail em formato válido, `consentimentoAceito === true`) e devolve um `LeadValidado` **sem** o campo `consentimentoAceito` — ele nunca é persistido (SDD § Modelo de dados: a prova de consentimento é a própria existência do registro).

`shared/resultado-validacao.ts` define o tipo `ResultadoValidacao<T>` comum às duas validações acima, para não duplicar a mesma forma de "sucesso ou lista de erros" duas vezes.
