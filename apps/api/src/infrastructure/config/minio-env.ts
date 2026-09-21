/**
 * Leitura das variáveis de ambiente que a Infraestrutura precisa para falar
 * com o MinIO (SDD § Modelo de dados → `media_assets`; § "Migração de
 * plataforma de dados" → Armazenamento). Nenhum valor real é hardcoded aqui
 * — tudo vem de `process.env`, documentado em `apps/api/.env.example`.
 *
 * Espelha o mesmo estilo de `mysql-env.ts`/`supabase-env.ts` (leitura +
 * validação descritiva) — troca de adaptador, não de padrão. O cliente S3
 * sempre autentica com as credenciais `root` do MinIO
 * (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) — este projeto não distingue uma
 * credencial de aplicação de uma credencial administrativa no MinIO hoje
 * (mesmo comentário já registrado em `.env.example` da raiz), diferente do
 * MySQL, que tem um usuário de aplicação dedicado.
 */
export interface MinioEnv {
  /**
   * URL completa do endpoint do MinIO (ex. `http://minio:9000`, montada a
   * partir do nome do serviço no `docker-compose.yml`). Lida diretamente de
   * `MINIO_ENDPOINT` quando definida; senão, construída a partir de
   * `MINIO_HOST`/`MINIO_PORT` (default `minio`/`9000`, os mesmos valores que
   * `docker-compose.yml` usa internamente).
   */
  endpoint: string;
  /** Usuário root do MinIO (`MINIO_ROOT_USER`, ver `docker-compose.yml`). */
  accessKeyId: string;
  /** Senha root do MinIO (`MINIO_ROOT_PASSWORD`). */
  secretAccessKey: string;
  /** Bucket de imagens do CMS, já criado no startup pelo serviço `minio-init`. */
  bucket: string;
  /**
   * Região exigida pela assinatura SigV4 do AWS SDK — o MinIO não usa
   * regiões de fato (não distribui por região como a AWS), mas o SDK recusa
   * assinar uma requisição sem uma. `us-east-1` é o valor convencional
   * recomendado pela própria documentação do MinIO para clientes S3
   * genéricos.
   */
  region: string;
}

const HOST_PADRAO = 'minio';
const PORTA_PADRAO = 9000;
const BUCKET_PADRAO = 'images';
const REGIAO_PADRAO = 'us-east-1';

function lerObrigatoria(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente "${nome}" é obrigatória e não foi definida.`);
  }
  return valor;
}

/**
 * @throws {Error} se `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` faltarem.
 * `MINIO_ENDPOINT` (ou `MINIO_HOST`/`MINIO_PORT`), `MINIO_BUCKET` e
 * `MINIO_REGION` são opcionais, com default de desenvolvimento.
 */
export function carregarMinioEnv(env: NodeJS.ProcessEnv = process.env): MinioEnv {
  const accessKeyId = lerObrigatoria(env, 'MINIO_ROOT_USER');
  const secretAccessKey = lerObrigatoria(env, 'MINIO_ROOT_PASSWORD');

  const endpoint = env.MINIO_ENDPOINT ?? `http://${env.MINIO_HOST ?? HOST_PADRAO}:${env.MINIO_PORT ?? PORTA_PADRAO}`;

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket: env.MINIO_BUCKET ?? BUCKET_PADRAO,
    region: env.MINIO_REGION ?? REGIAO_PADRAO,
  };
}
