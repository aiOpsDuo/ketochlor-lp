import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LoginUseCase } from '../../application/auth/login.use-case';
import type { LoginDto } from './login.dto';

/** Mesma mensagem genérica para e-mail inexistente OU senha errada — nunca revela qual dos dois aconteceu (SDD § Autenticação). */
const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha inválidos.';

/**
 * `POST /api/auth/login` (SDD § Contratos de dados/API/interfaces —
 * Autenticação; PLAN.md, tarefa `ajustes/migracao-mysql-modulo-auth-proprio`).
 *
 * Fica fora de `/api/admin/*` de propósito — mesmo padrão de
 * `ContentPublicController`: `AuthGuard` só exige token para requisições sob
 * aquele prefixo, então este controller nunca precisa de `@UseGuards` (nem
 * poderia: é literalmente a rota que PRODUZ o token que `AuthGuard` verifica
 * em toda outra rota administrativa).
 *
 * Nenhuma regra de negócio aqui — só tradução HTTP↔caso de uso, mesmo padrão
 * de `OperatorsAdminController`.
 */
@Controller('auth')
export class AuthLoginController {
  constructor(
    // `@Inject` explícito — ver comentário de decisão em
    // `content-public.controller.ts` (Vitest/esbuild não emite
    // `design:paramtypes`).
    @Inject(LoginUseCase) private readonly login: LoginUseCase,
  ) {}

  // `200`, não o `201` default do Nest para `@Post` — SDD § Contratos de
  // dados/API/interfaces: `POST /api/auth/login` devolve `200 { accessToken }`
  // (não cria um recurso novo, troca credenciais por sessão).
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async autenticar(@Body() body: LoginDto) {
    const resultado = await this.login.executar(body);

    if (resultado.sucesso) {
      return { accessToken: resultado.accessToken };
    }

    if (resultado.motivo === 'validacao') {
      // Mesmo formato de erro de `OperatorsAdminController.criar`:
      // `statusCode` explícito porque passar um objeto para
      // `UnprocessableEntityException` o usa COMO O CORPO INTEIRO da
      // resposta, sem injetar `statusCode` automaticamente.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Dados inválidos para o login.',
        erros: resultado.erros,
      });
    }

    // `resultado.motivo === 'credenciais-invalidas'` — mesma mensagem
    // genérica de `MENSAGEM_CREDENCIAIS_INVALIDAS` tanto para e-mail
    // inexistente quanto para senha errada (`LoginUseCase` já colapsou os
    // dois casos num só antes de chegar aqui).
    throw new UnauthorizedException(MENSAGEM_CREDENCIAIS_INVALIDAS);
  }
}
