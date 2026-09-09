import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ExcluirLeadUseCase } from '../../application/leads/excluir-lead.use-case';
import { ExportarLeadsCsvUseCase } from '../../application/leads/exportar-leads-csv.use-case';
import { ListarLeadsUseCase } from '../../application/leads/listar-leads.use-case';
import type { FiltroPeriodoLeads } from '../../domain';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';

/**
 * Rotas administrativas de leads (SDD § Contratos de dados/API/interfaces —
 * Leads), todas sob `/api/admin/leads`, portanto já protegidas pelo
 * `AuthGuard` global (ver `presentation/auth/auth.guard.ts`) sem precisar de
 * `@UseGuards` aqui — mesmo padrão de `ContentAdminController`/
 * `MetadataAdminController`.
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso.
 */
@Controller(`${ADMIN_SEGMENT}/leads`)
export class LeadsAdminController {
  // `@Inject(ClasseDoCasoDeUso)` explícito em cada parâmetro — ver comentário
  // de decisão em `content-public.controller.ts`.
  constructor(
    @Inject(ListarLeadsUseCase) private readonly listarLeads: ListarLeadsUseCase,
    @Inject(ExportarLeadsCsvUseCase) private readonly exportarLeadsCsv: ExportarLeadsCsvUseCase,
    @Inject(ExcluirLeadUseCase) private readonly excluirLead: ExcluirLeadUseCase,
  ) {}

  @Get()
  async listar(@Query('from') from?: string, @Query('to') to?: string) {
    return this.listarLeads.executar(this.construirFiltro(from, to));
  }

  // Precisa vir declarada como rota literal (`export.csv`), não colide com
  // `:id` porque `:id` só existe no `@Delete` abaixo, nunca num `@Get` deste
  // controller.
  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportarCsv(@Query('from') from?: string, @Query('to') to?: string): Promise<string> {
    return this.exportarLeadsCsv.executar(this.construirFiltro(from, to));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@Param('id') id: string): Promise<void> {
    const removido = await this.excluirLead.executar(id);
    if (!removido) {
      throw new NotFoundException(`Lead "${id}" não encontrado.`);
    }
  }

  /**
   * Traduz os parâmetros de query `from`/`to` (strings ISO 8601, SDD §
   * Contratos de dados/API/interfaces) para `FiltroPeriodoLeads` (Domínio) —
   * tradução de forma HTTP, não regra de negócio, por isso vive aqui e não
   * num caso de uso. Um valor presente mas que não é uma data válida é
   * rejeitado com `400` antes de alcançar o repositório: sem esta checagem, a
   * string chegaria direto à query do Postgres (`gte`/`lte` sobre
   * `timestamptz`), que devolveria um erro de sintaxe traduzido em `500` —
   * pior sinal para quem chama a API do que um `400` explícito sobre qual
   * parâmetro está mal formado.
   */
  private construirFiltro(from?: string, to?: string): FiltroPeriodoLeads {
    this.validarDataIso(from, 'from');
    this.validarDataIso(to, 'to');
    return { from, to };
  }

  private validarDataIso(valor: string | undefined, campo: string): void {
    if (valor !== undefined && Number.isNaN(Date.parse(valor))) {
      throw new BadRequestException(
        `O parâmetro "${campo}" precisa ser uma data ISO 8601 válida.`,
      );
    }
  }
}
