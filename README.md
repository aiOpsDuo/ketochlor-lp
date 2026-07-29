# Ketochlor® LP — React + Tailwind + TypeScript

Landing page B2B de captura de leads (médicos-veterinários) para o Ketochlor® (Virbac),
implementada a partir da direção de arte aprovada na Fase 0 (v10).

## Rodando localmente

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção em /dist
npm run preview   # servir o build de produção localmente
```

## Estrutura

- `src/components/` — um componente por seção da LP (Header, Hero, Problema, Fenótipos,
  Mecanismo, TecnologiaSIS, ProvaAutoridade, Protocolo, Diferenciais, FormularioCTA,
  CTASecundario, FAQ, Footer).
- `src/data/content.ts` — toda a copy da LP (textos, referências, FAQ, tabela de dosagem),
  extraída do Copy Deck e da LP Copy já aprovados. Nenhum texto foi criado nesta etapa.
- `src/types.ts` — tipos compartilhados (nav, formulário de lead, FAQ, tabela de dosagem).
- `public/assets/` — assets oficiais da campanha (ver pendências abaixo).

## Header / navegação

Header fixo (`position: fixed`) com altura de 76px, navegação por 7 âncoras (Início, O
Problema, Mecanismo, Tecnologia SIS, Protocolo, Diferenciais, FAQ) e scroll suave via
`window.scrollTo({ behavior: 'smooth' })` com offset para compensar a altura do header.
O item ativo é destacado via `IntersectionObserver`. No mobile, o menu abre como overlay
de tela cheia.

## Pendências conhecidas (não resolvidas nesta etapa, fora do escopo do design)

1. **Logo sem transparência real.** O arquivo oficial `logo-ketochlor.png` tem fundo
   branco sólido (não é PNG transparente). Foi gerada uma versão com chroma-key
   (`logo-ketochlor-transp.png`, usada no Header/Hero/Footer) apenas como solução de
   visualização — a Virbac precisa fornecer a logo vetorizada/transparente oficial antes
   do lançamento em produção.
2. **Integração com Salesforce Marketing Cloud.** O formulário (`FormularioCTA.tsx`) está
   funcional no front-end (validação, estado, confirmação visual), mas o envio ainda não
   está conectado a nenhum backend/CRM — está marcado com `// TODO` no código. O fluxo de
   transferência de leads para o Salesforce Marketing Cloud ainda não foi definido (risco
   operacional já registrado no briefing).
3. **Tipografia.** Usando fontes do sistema como stand-in para Sora (headings) e Inter
   (body) — a fonte oficial da marca (Allumi Pro) está pendente de licenciamento pela
   Virbac. Basta importar as fontes reais e ajustar `tailwind.config.ts` quando
   disponíveis.
4. **Pixels, analytics e eventos de tracking** (visualização de seção, cliques de CTA,
   envio de formulário) ainda não foram implementados — dependem da definição do Plano de
   Mensuração.

## Adaptação mobile da Hero

No mockup de Fase 0, a Hero desktop usa um painel diagonal azul atrás do produto. No
mobile, essa mesma composição não coube de forma legível em telas estreitas — a versão
mobile usa layout empilhado (texto → produto), consistente com o tratamento fotográfico
usado nas demais seções (Problema, Tecnologia SIS).
