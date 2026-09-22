// Camada de Infraestrutura da API (SDD § Camadas e padrão arquitetural —
// Infraestrutura). Adaptadores que implementam as portas do Domínio contra
// MySQL (conteúdo, metadados, leads, operadores) e MinIO (mídia), mais o
// módulo de autenticação própria (`AppJwt*`); depende do Domínio, nunca o
// contrário.

export * from './config/mysql-env';
export * from './config/minio-env';
export * from './config/auth-jwt-env';
export * from './mysql/mysql-client.factory';
export * from './mysql/content-sections.repository';
export * from './mysql/site-metadata.repository';
export * from './mysql/leads.repository';
export * from './mysql/operadores.repository';
export * from './minio/minio-client.factory';
export * from './minio/media-assets.repository';
export * from './auth/app-jwt-token-verificador';
export * from './auth/app-jwt';
