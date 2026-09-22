// Camada de Domínio da API (SDD § Camadas e padrão arquitetural — Domínio).
// Sem nenhum import de `@nestjs/*` nem de SDK de terceiro — puro TypeScript,
// testável isoladamente. Consumida pela Aplicação, nunca o contrário.

export * from './shared/resultado-validacao';

export * from './content/chave-secao-invalida.error';
export * from './content/validar-conteudo-secao';

export * from './visibilidade/filtrar-conteudo-publicado';

export * from './leads/validar-lead';

export * from './metadata/validar-site-metadata';

export * from './media/validar-solicitacao-upload';

export * from './operators/operador';
export * from './operators/remocao-operador-recusada.error';
export * from './operators/validar-criacao-operador';

export * from './auth/validar-login';

// Portas implementadas pela Infraestrutura (`src/infrastructure/`) —
// interfaces puras, sem import de framework (a Infraestrutura depende do
// Domínio implementando-as, nunca o contrário).
export * from './portas/content-sections.repository';
export * from './portas/site-metadata.repository';
export * from './portas/media-assets.repository';
export * from './portas/leads.repository';
export * from './portas/operadores.repository';
export * from './portas/operador-credenciais.repository';
export * from './portas/verificador-token';
export * from './portas/emissor-token';
