import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { VerificadorToken } from '../../domain/portas/verificador-token';
// `express-request.d.ts` (mesma pasta) aumenta `Request` com `usuario` — é um
// arquivo de declaração de tipo, o TypeScript o inclui automaticamente no
// programa; nunca importe um `.d.ts` como módulo em runtime (Vite/Node não
// têm o que carregar dele).
import { ADMIN_ROUTE_PREFIX } from './route-prefixes';
import { VERIFICADOR_TOKEN } from './verificador-token.token';

const PREFIXO_BEARER = 'Bearer ';

/**
 * Protege toda rota sob `ADMIN_ROUTE_PREFIX` (/api/admin), verificando o JWT
 * do Supabase Auth via a porta `VerificadorToken` do Domínio (SDD § Contratos
 * de dados/API/interfaces → Autenticação; PRD § segurança de acesso).
 *
 * Decisão de design (tarefa api/modulo-auth, confirmada via Context7/docs do
 * NestJS): o Nest não tem uma forma nativa de vincular um Guard (`CanActivate`)
 * a um PREFIXO de rota — só a nível de controller/handler (`@UseGuards`) ou
 * globalmente (`APP_GUARD`, ver `auth.module.ts`). Vincular por controller
 * exigiria lembrar de decorar cada controller novo dentro de `/api/admin` com
 * `@UseGuards(AuthGuard)` — exatamente o "proteja explicitamente cada rota
 * nova" que a tarefa pede para evitar, por ser esquecível. Por isso este guard
 * é registrado GLOBALMENTE (todo request passa por ele) e decide sozinho, pelo
 * caminho da requisição, se aquela rota exige token: qualquer rota nova
 * registrada sob `/api/admin/*`, em qualquer controller/módulo futuro (ver
 * `api/modulo-content`, `api/modulo-metadata` etc.), fica protegida
 * automaticamente, sem exigir nenhuma anotação adicional — "seguro por
 * padrão". O custo aceito: uma checagem de string de caminho dentro do guard,
 * em vez de vínculo declarativo por controller — proporcional ao risco que se
 * evita (rota administrativa nova esquecida sem proteção).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(VERIFICADOR_TOKEN) private readonly verificadorToken: VerificadorToken) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.path.startsWith(ADMIN_ROUTE_PREFIX)) {
      return true;
    }

    const token = this.extrairTokenDoHeader(request);
    if (!token) {
      throw new UnauthorizedException(
        'Cabeçalho "Authorization: Bearer <token>" ausente ou mal formado.',
      );
    }

    const resultado = await this.verificadorToken.verificar(token);
    if (!resultado.valido) {
      throw new UnauthorizedException(resultado.motivo);
    }

    // Anexado para uso futuro por outros módulos (ex. `updatedBy`/`createdBy`
    // nas escritas de `api/modulo-content`, `api/modulo-metadata` etc.).
    request.usuario = resultado.claims;
    return true;
  }

  private extrairTokenDoHeader(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header || !header.startsWith(PREFIXO_BEARER)) {
      return null;
    }
    const token = header.slice(PREFIXO_BEARER.length).trim();
    return token.length > 0 ? token : null;
  }
}
