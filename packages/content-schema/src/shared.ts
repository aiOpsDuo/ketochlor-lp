import { z } from 'zod';

/**
 * Campo de imagem comum a qualquer seção. Nesta fase do projeto ainda não existe
 * armazenamento real de mídia (ver `media_assets` no SDD) — por isso a referência
 * à imagem é só uma URL (relativa, hoje, para os assets estáticos da LP; absoluta,
 * quando o Storage entrar em cena). Um campo `mediaId` apontando para
 * `media_assets.id` chega quando a API/painel de upload existirem
 * (`api/modulo-media`); adicioná-lo antes disso seria um campo sem nada que o
 * preencha.
 *
 * `alt` é sempre obrigatório: nenhuma seção pode salvar uma imagem sem texto
 * alternativo (SDD § Critérios de aceitação por capacidade — Upload de imagem).
 */
export const imageFieldSchema = z.object({
  url: z.string().min(1, 'A URL da imagem é obrigatória.'),
  alt: z.string().min(1, 'O texto alternativo (alt) da imagem é obrigatório.'),
});

export type ImageField = z.infer<typeof imageFieldSchema>;
