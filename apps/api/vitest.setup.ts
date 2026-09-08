// Carrega apps/api/.env (gitignored) antes da suíte de testes, para os
// testes de integração de `src/infrastructure` (contra o Supabase local)
// terem SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_JWT_SECRET
// disponíveis sem exigir export manual no shell.
import 'dotenv/config';
