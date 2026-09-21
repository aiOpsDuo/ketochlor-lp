// Carrega apps/api/.env (gitignored) antes da suíte de testes, para os
// testes de integração/e2e (contra o `mysql`/`minio` reais do
// docker-compose.yml) terem MYSQL_*/MINIO_*/AUTH_JWT_SECRET disponíveis sem
// exigir export manual no shell.
import 'dotenv/config';
