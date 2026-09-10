import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CriarOperadorUseCase } from '../../application/operators/criar-operador.use-case';
import { ListarOperadoresUseCase } from '../../application/operators/listar-operadores.use-case';
import { RemoverOperadorUseCase } from '../../application/operators/remover-operador.use-case';
import { RemocaoOperadorRecusadaError } from '../../domain';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';
import type { CriarOperadorDto } from './criar-operador.dto';

/**
 * Rotas administrativas de operadores (PLAN.md, tarefa
 * `ajustes/modulo-operadores`), todas sob `/api/admin/operators`, portanto já
 * protegidas pelo `AuthGuard` global (ver `presentation/auth/auth.guard.ts`)
 * sem precisar de `@UseGuards` aqui — mesmo padrão de `MetadataAdminController`/
 * `LeadsAdminController`.
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso.
 */
@Controller(`${ADMIN_SEGMENT}/operators`)
export class OperatorsAdminController {
  // `@Inject(ClasseDoCasoDeUso)` explícito em cada parâmetro — ver comentário
  // de decisão em `content-public.controller.ts` (o Vitest, via esbuild, não
  // emite `design:paramtypes`).
  constructor(
    @Inject(ListarOperadoresUseCase) private readonly listarOperadores: ListarOperadoresUseCase,
    @Inject(CriarOperadorUseCase) private readonly criarOperador: CriarOperadorUseCase,
    @Inject(RemoverOperadorUseCase) private readonly removerOperador: RemoverOperadorUseCase,
  ) {}

  @Get()
  async listar() {
    return this.listarOperadores.executar();
  }

  @Post()
  async criar(@Body() body: CriarOperadorDto) {
    const resultado = await this.criarOperador.executar(body);
    if (!resultado.sucesso) {
      // Mesmo formato de erro de `MetadataAdminController.atualizar`:
      // `statusCode` explícito porque passar um objeto para
      // `UnprocessableEntityException` o usa COMO O CORPO INTEIRO da
      // resposta, sem injetar `statusCode` automaticamente.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Dados inválidos para a criação do operador.',
        erros: resultado.erros,
      });
    }
    return resultado.operador;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(@Param('id') id: string, @Req() request: Request): Promise<void> {
    // `request.usuario` é anexado pelo `AuthGuard` — sempre presente aqui,
    // porque esta rota está sob `/api/admin` (mesmo comentário de
    // `ContentAdminController.atualizar`).
    const idOperadorAtual = request.usuario?.sub ?? '';

    const removido = await this.executarOuConflito(() =>
      this.removerOperador.executar(id, idOperadorAtual),
    );
    if (!removido) {
      throw new NotFoundException(`Operador "${id}" não encontrado.`);
    }
  }

  /**
   * Traduz `RemocaoOperadorRecusadaError` (Domínio, lançado por
   * `RemoverOperadorUseCase` quando a remoção violaria uma das duas
   * invariantes de acesso administrativo) para `409 Conflict` — mesmo padrão
   * de captura de erro de domínio já usado em `ContentAdminController` para
   * `ChaveSecaoInvalidaError`.
   */
  private async executarOuConflito(executar: () => Promise<boolean>): Promise<boolean> {
    try {
      return await executar();
    } catch (erro) {
      if (erro instanceof RemocaoOperadorRecusadaError) {
        throw new ConflictException(erro.message);
      }
      throw erro;
    }
  }
}
