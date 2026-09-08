// Fonte única de esquema e conteúdo inicial das 11 seções do CMS Ketochlor LP
// (ver SDD § Linguagem ubíqua — "Esquema de seção"). Consumida por:
// - `apps/api`, para validar `PUT /api/admin/sections/:key` (422 se inválido);
// - `apps/admin`, para gerar o formulário de edição de cada seção;
// - `apps/lp`, para os tipos do conteúdo renderizado e o instantâneo de conteúdo.
//
// Para adicionar um campo novo a uma seção existente, ver README.md § Manutenção.

export * from './shared.js';

export * from './sections/hero.js';
export * from './sections/problema.js';
export * from './sections/fenotipos.js';
export * from './sections/mecanismo.js';
export * from './sections/tecnologia_sis.js';
export * from './sections/prova_autoridade.js';
export * from './sections/protocolo.js';
export * from './sections/diferenciais.js';
export * from './sections/material_tecnico.js';
export * from './sections/cta_secundario.js';
export * from './sections/faq.js';

import { heroSchema, heroInitialContent } from './sections/hero.js';
import { problemaSchema, problemaInitialContent } from './sections/problema.js';
import { fenotiposSchema, fenotiposInitialContent } from './sections/fenotipos.js';
import { mecanismoSchema, mecanismoInitialContent } from './sections/mecanismo.js';
import {
  tecnologiaSisSchema,
  tecnologiaSisInitialContent,
} from './sections/tecnologia_sis.js';
import {
  provaAutoridadeSchema,
  provaAutoridadeInitialContent,
} from './sections/prova_autoridade.js';
import { protocoloSchema, protocoloInitialContent } from './sections/protocolo.js';
import {
  diferenciaisSchema,
  diferenciaisInitialContent,
} from './sections/diferenciais.js';
import {
  materialTecnicoSchema,
  materialTecnicoInitialContent,
} from './sections/material_tecnico.js';
import {
  ctaSecundarioSchema,
  ctaSecundarioInitialContent,
} from './sections/cta_secundario.js';
import { faqSchema, faqInitialContent } from './sections/faq.js';

/**
 * Registro das 11 seções do CMS — conjunto fechado (SDD § Linguagem ubíqua —
 * "Seção"). Cada entrada expõe o schema Zod de validação e o conteúdo
 * inicial (migrado literalmente de `apps/lp/src/data/content.ts`) que essa
 * mesma instância de schema aceita.
 */
export const CONTENT_SECTIONS = {
  hero: { schema: heroSchema, initialContent: heroInitialContent },
  problema: { schema: problemaSchema, initialContent: problemaInitialContent },
  fenotipos: { schema: fenotiposSchema, initialContent: fenotiposInitialContent },
  mecanismo: { schema: mecanismoSchema, initialContent: mecanismoInitialContent },
  tecnologia_sis: {
    schema: tecnologiaSisSchema,
    initialContent: tecnologiaSisInitialContent,
  },
  prova_autoridade: {
    schema: provaAutoridadeSchema,
    initialContent: provaAutoridadeInitialContent,
  },
  protocolo: { schema: protocoloSchema, initialContent: protocoloInitialContent },
  diferenciais: {
    schema: diferenciaisSchema,
    initialContent: diferenciaisInitialContent,
  },
  material_tecnico: {
    schema: materialTecnicoSchema,
    initialContent: materialTecnicoInitialContent,
  },
  cta_secundario: {
    schema: ctaSecundarioSchema,
    initialContent: ctaSecundarioInitialContent,
  },
  faq: { schema: faqSchema, initialContent: faqInitialContent },
} as const;

/** Um dos 11 identificadores fechados de seção (SDD § Modelo de dados). */
export type SectionKey = keyof typeof CONTENT_SECTIONS;
