import { S3Client } from '@aws-sdk/client-s3';
import type { MinioEnv } from '../config/minio-env';

/**
 * Cria o cliente S3 do lado do servidor, apontado para o MinIO
 * (SDD § "Migração de plataforma de dados" → Armazenamento). Único ponto do
 * código que instancia o `S3Client` — todo repositório de Infraestrutura que
 * fala com o MinIO recebe este cliente por injeção, nunca cria o seu
 * próprio (mesmo padrão de `mysql-client.factory.ts`/
 * `supabase-client.factory.ts`).
 *
 * `forcePathStyle: true` é obrigatório para MinIO: o SDK, por padrão, monta
 * URLs no estilo "virtual-hosted" (`https://<bucket>.<endpoint>/<key>`,
 * único suportado pela AWS desde 2020), mas o MinIO (como a maioria dos
 * servidores S3-compatíveis self-hosted) só resolve pelo estilo de caminho
 * (`https://<endpoint>/<bucket>/<key>`) — sem essa flag, tanto o upload
 * quanto a URL pré-assinada apontam para um host que não existe
 * (`<bucket>.minio:9000`) ou falham a assinatura (`SignatureDoesNotMatch`).
 * Confirmado contra a documentação oficial do MinIO e discussões do
 * repositório `minio/minio` sobre o AWS SDK JS v3 (ex. issues #13779/#15693
 * e discussão #14709, "signed URL doesn't work" / "signature mismatch" sem
 * `forcePathStyle`), e validado empiricamente pelos testes de integração
 * reais desta tarefa contra o `minio` do compose.
 */
export function criarMinioClient(env: MinioEnv): S3Client {
  return new S3Client({
    endpoint: env.endpoint,
    region: env.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}
