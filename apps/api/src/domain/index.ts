// Camada de Domínio da API (SDD § Camadas e padrão arquitetural — Domínio).
// Sem nenhum import de `@nestjs/*` nem de SDK do Supabase — puro TypeScript,
// testável isoladamente. Consumida pela Aplicação (ainda inexistente nesta
// tarefa), nunca o contrário.

export * from './shared/resultado-validacao';

export * from './content/chave-secao-invalida.error';
export * from './content/validar-conteudo-secao';

export * from './visibilidade/filtrar-conteudo-publicado';

export * from './leads/validar-lead';
