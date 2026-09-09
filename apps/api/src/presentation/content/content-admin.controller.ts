import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Put,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AlternarVisibilidadeSecaoUseCase } from '../../application/content/alternar-visibilidade-secao.use-case';
import { AtualizarSecaoUseCase } from '../../application/content/atualizar-secao.use-case';
import { ConsultarSecaoUseCase } from '../../application/content/consultar-secao.use-case';
import { ListarSecoesUseCase } from '../../application/content/listar-secoes.use-case';
import { ChaveSecaoInvalidaError } from '../../domain';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';
import type { AtualizarSecaoDto } from './atualizar-secao.dto';

/**
 * Rotas administrativas de conteúdo (SDD § Contratos de dados/API/interfaces
 * — "Conteúdo administrativo"), todas sob `/api/admin/sections`, portanto já
 * protegidas pelo `AuthGuard` global (ver `presentation/auth/auth.guard.ts`)
 * sem precisar de `@UseGuards` aqui.
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso:
 * decide status code a partir do que a Aplicação devolve/lança, nunca decide
 * se um dado é válido ou o que persistir (isso é `validarConteudoSecao` e os
 * casos de uso em `application/content`).
 */
@Controller(`${ADMIN_SEGMENT}/sections`)
export class ContentAdminController {
  // `@Inject(ClasseDoCasoDeUso)` explícito em cada parâmetro — ver comentário
  // de decisão em `content-public.controller.ts` (o Vitest, via esbuild, não
  // emite `design:paramtypes`; a injeção implícita por tipo só funciona no
  // build real via `nest build`/`tsc`).
  constructor(
    @Inject(ListarSecoesUseCase) private readonly listarSecoes: ListarSecoesUseCase,
    @Inject(ConsultarSecaoUseCase) private readonly consultarSecao: ConsultarSecaoUseCase,
    @Inject(AtualizarSecaoUseCase) private readonly atualizarSecao: AtualizarSecaoUseCase,
    @Inject(AlternarVisibilidadeSecaoUseCase)
    private readonly alternarVisibilidadeSecao: AlternarVisibilidadeSecaoUseCase,
  ) {}

  @Get()
  async listar() {
    return this.listarSecoes.executar();
  }

  @Get(':key')
  async obter(@Param('key') key: string) {
    const secao = await this.executarOuChave404(() => this.consultarSecao.executar(key), key);
    if (!secao) {
      throw new NotFoundException(`Seção "${key}" não encontrada.`);
    }
    return secao;
  }

  @Put(':key')
  async atualizar(
    @Param('key') key: string,
    @Body() body: AtualizarSecaoDto,
    @Req() request: Request,
  ) {
    // `request.usuario` é anexado pelo `AuthGuard` após verificar o token
    // (ver `presentation/auth/express-request.d.ts`) — sempre presente aqui,
    // porque esta rota está sob `/api/admin` e o guard já barrou com `401`
    // qualquer requisição sem token válido antes de chegar ao controller.
    const updatedBy = request.usuario?.sub ?? null;

    const resultado = await this.executarOuChave404(
      () => this.atualizarSecao.executar(key, body, updatedBy),
      key,
    );

    if (resultado === null) {
      throw new NotFoundException(`Seção "${key}" não encontrada.`);
    }
    if (!resultado.sucesso) {
      // Passar um objeto (em vez de string) para `UnprocessableEntityException`
      // faz o Nest usá-lo COMO O CORPO INTEIRO da resposta, sem injetar
      // `statusCode` automaticamente (`HttpException.createBody`, ver
      // `@nestjs/common/exceptions/http.exception.js`) — por isso `statusCode`
      // é explícito aqui, para manter o formato de erro uniforme do SDD
      // (§ Contratos de dados/API/interfaces: `{ message, statusCode }`),
      // com `erros` como extensão carregando a lista de campos inválidos.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: `Dados inválidos para a seção "${key}".`,
        erros: resultado.erros,
      });
    }
    return resultado.secao;
  }

  @Patch(':key/visibility')
  async alternarVisibilidade(@Param('key') key: string, @Req() request: Request) {
    const updatedBy = request.usuario?.sub ?? null;
    const secao = await this.executarOuChave404(
      () => this.alternarVisibilidadeSecao.executar(key, updatedBy),
      key,
    );
    if (!secao) {
      throw new NotFoundException(`Seção "${key}" não encontrada.`);
    }
    return secao;
  }

  /**
   * Traduz `ChaveSecaoInvalidaError` (Domínio, lançado pelos casos de uso
   * quando `:key` não é uma das 11 seções fechadas) para `404` — único ponto
   * de tradução desse erro, para não repetir o mesmo `try/catch` em cada
   * handler.
   */
  private async executarOuChave404<T>(executar: () => Promise<T>, key: string): Promise<T> {
    try {
      return await executar();
    } catch (erro) {
      if (erro instanceof ChaveSecaoInvalidaError) {
        throw new NotFoundException(`"${key}" não é uma das 11 seções fechadas do CMS.`);
      }
      throw erro;
    }
  }
}
