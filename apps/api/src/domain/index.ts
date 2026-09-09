// Camada de Domínio da API (SDD § Camadas e padrão arquitetural — Domínio).
// Sem nenhum import de `@nestjs/*` nem de SDK do Supabase — puro TypeScript,
// testável isoladamente. Consumida pela Aplicação (ainda inexistente nesta
// tarefa), nunca o contrário.

export * from './shared/resultado-validacao';

export * from './content/chave-secao-invalida.error';
export * from './content/validar-conteudo-secao';

export * from './visibilidade/filtrar-conteudo-publicado';

export * from './leads/validar-lead';

export * from './metadata/validar-site-metadata';

export * from './media/validar-solicitacao-upload';

// Portas implementadas pela Infraestrutura (`api/infra-supabase-adapters`) —
// interfaces puras, sem import de framework nem de Supabase (a Infraestrutura
// depende do Domínio implementando-as, nunca o contrário).
export * from './portas/content-sections.repository';
export * from './portas/site-metadata.repository';
export * from './portas/media-assets.repository';
export * from './portas/leads.repository';
export * from './portas/verificador-token';
