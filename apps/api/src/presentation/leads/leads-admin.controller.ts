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
import type { FiltroLeads } from '../../domain';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';

/**
 * Tamanho máximo da busca por e-mail — o mesmo `VARCHAR(255)` da coluna
 * `leads.email` (`0004_create_leads.sql`): um trecho maior que isso nunca
 * estaria contido em e-mail nenhum, então é recusado em vez de virar uma
 * consulta que só pode voltar vazia.
 */
const TAMANHO_MAXIMO_BUSCA_EMAIL = 255;

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
  async listar(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('email') email?: string,
  ) {
    return this.listarLeads.executar(this.construirFiltro(from, to, email));
  }

  // Precisa vir declarada como rota literal (`export.csv`), não colide com
  // `:id` porque `:id` só existe no `@Delete` abaixo, nunca num `@Get` deste
  // controller.
  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportarCsv(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('email') email?: string,
  ): Promise<string> {
    return this.exportarLeadsCsv.executar(this.construirFiltro(from, to, email));
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
   * Contratos de dados/API/interfaces) e `email` para `FiltroLeads` (Domínio) —
   * tradução de forma HTTP, não regra de negócio, por isso vive aqui e não
   * num caso de uso. Um valor presente mas que não é uma data válida é
   * rejeitado com `400` antes de alcançar o repositório: sem esta checagem, a
   * string chegaria direto à query do Postgres (`gte`/`lte` sobre
   * `timestamptz`), que devolveria um erro de sintaxe traduzido em `500` —
   * pior sinal para quem chama a API do que um `400` explícito sobre qual
   * parâmetro está mal formado. Mesmo critério para `email` (ver
   * `normalizarBuscaEmail`).
   */
  private construirFiltro(from?: string, to?: string, email?: string): FiltroLeads {
    this.validarDataIso(from, 'from');
    this.validarDataIso(to, 'to');
    return { from, to, email: this.normalizarBuscaEmail(email) };
  }

  /**
   * `email` é texto livre de busca ("contém", não um e-mail completo — ver
   * `FiltroLeads.email`), então não passa por validação de formato: só
   * `trim`, e vazio vira "sem filtro" (`undefined`) em vez de uma busca por
   * `""`, que casaria tudo de qualquer forma. Recusado com `400` quando
   * repetido na query (`?email=a&email=b` chega como array pelo parser do
   * Express — sem esta checagem, `.trim()` estouraria um `500`) ou maior que
   * `TAMANHO_MAXIMO_BUSCA_EMAIL`.
   */
  private normalizarBuscaEmail(valor: unknown): string | undefined {
    if (valor === undefined) {
      return undefined;
    }
    if (typeof valor !== 'string') {
      throw new BadRequestException('O parâmetro "email" precisa ser um único texto.');
    }
    const busca = valor.trim();
    if (busca.length > TAMANHO_MAXIMO_BUSCA_EMAIL) {
      throw new BadRequestException(
        `O parâmetro "email" pode ter no máximo ${TAMANHO_MAXIMO_BUSCA_EMAIL} caracteres.`,
      );
    }
    return busca.length > 0 ? busca : undefined;
  }

  private validarDataIso(valor: string | undefined, campo: string): void {
    if (valor !== undefined && Number.isNaN(Date.parse(valor))) {
      throw new BadRequestException(
        `O parâmetro "${campo}" precisa ser uma data ISO 8601 válida.`,
      );
    }
  }
}
