#!/bin/sh
# Roda uma vez pelo serviço `minio-init` (docker-compose.yml), cria o bucket
# de imagens do CMS se ainda não existir, e aplica a policy de leitura
# pública — ver docs/BANCO-DE-DADOS.md § "Bucket MinIO (`images`)".
#
# Não usamos `mc anonymous set download`: essa policy canônica do mc concede
# tanto `s3:GetObject` (download de objeto) quanto `s3:ListBucket`/
# `s3:GetBucketLocation` no bucket inteiro (confirmado empiricamente via
# `mc anonymous get-json` — a policy "download" não é só leitura de objeto,
# como o nome sugere). Isso listaria publicamente todos os arquivos do
# bucket, o que o critério de "pronto" da tarefa
# `ajustes/migracao-mysql-minio-bucket-leitura-publica` proíbe
# explicitamente. Em vez disso, aplicamos uma policy JSON própria com só
# `s3:GetObject` sobre `arn:aws:s3:::$MINIO_BUCKET/*` (via
# `mc anonymous set-json`) — equivalente exato à policy `images_public_read`
# que o Supabase Storage original tinha (leitura pública de objeto já
# publicado, sem listagem — ver
# supabase/migrations/20260908200805_enable_rls_and_storage.sql).
set -eu

mc alias set cms "http://minio:9000" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"
mc mb --ignore-existing "cms/${MINIO_BUCKET}"

POLICY_FILE="$(mktemp)"
cat >"${POLICY_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${MINIO_BUCKET}/*"]
    }
  ]
}
EOF

mc anonymous set-json "${POLICY_FILE}" "cms/${MINIO_BUCKET}"
