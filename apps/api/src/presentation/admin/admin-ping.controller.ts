import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
// `express-request.d.ts` (`../auth`) aumenta `Request` com `usuario` — arquivo
// de declaração de tipo, incluído automaticamente pelo TypeScript; nunca
// importado como módulo em runtime.
import { ADMIN_SEGMENT } from '../auth/route-prefixes';

/**
 * Controller de EXEMPLO, existe só para provar o `AuthGuard` de ponta a ponta
 * nesta tarefa (`api/modulo-auth`) — não é um módulo de produto. Descartável
 * assim que o primeiro módulo real sob `/api/admin` existir
 * (`api/modulo-content`); os módulos futuros reaproveitam o mesmo
 * `AuthGuard`/`AuthModule`, não recriam a autenticação.
 */
@Controller(ADMIN_SEGMENT)
export class AdminPingController {
  @Get('ping')
  ping(@Req() request: Request) {
    return { usuario: request.usuario };
  }
}
