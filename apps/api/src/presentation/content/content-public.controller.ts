import { Controller, Get, Inject } from '@nestjs/common';
import { ConsultarConteudoPublicadoUseCase } from '../../application/content/consultar-conteudo-publicado.use-case';

/**
 * `GET /api/content` (SDD § Contratos de dados/API/interfaces — "Conteúdo
 * público", sem autenticação).
 *
 * Fica fora de `/api/admin/*` de propósito: `AuthGuard` (registrado
 * globalmente por `AuthModule`, ver `presentation/auth/auth.guard.ts`) só
 * exige token para requisições cujo caminho comece com `/api/admin` — este
 * controller nunca precisa de `@UseGuards` nem de qualquer anotação extra
 * para permanecer público, basta não registrar sua rota sob aquele prefixo
 * (confirmado por teste e2e, `content.e2e.test.ts`, não presumido).
 */
@Controller('content')
export class ContentPublicController {
  constructor(
    // `@Inject(ClasseDoCasoDeUso)` explícito, em vez de depender só do tipo
    // do parâmetro: o Vitest transpila `.ts` via esbuild (não `tsc`), que não
    // emite `design:paramtypes` mesmo com `emitDecoratorMetadata: true` no
    // `tsconfig.json` — sem isso, o Nest não sabe resolver a injeção por tipo
    // implícito nos testes (embora resolvesse normalmente no build real via
    // `nest build`/`tsc`). Mesma razão pela qual `AuthGuard` já injeta
    // `VERIFICADOR_TOKEN` explicitamente, embora ali o motivo adicional seja
    // a porta ser uma interface (sem representação em runtime).
    @Inject(ConsultarConteudoPublicadoUseCase)
    private readonly consultarConteudoPublicado: ConsultarConteudoPublicadoUseCase,
  ) {}

  @Get()
  async obterConteudoPublicado() {
    return this.consultarConteudoPublicado.executar();
  }
}
