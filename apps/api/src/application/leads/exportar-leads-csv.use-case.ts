import { Inject, Injectable } from '@nestjs/common';
import type { FiltroPeriodoLeads } from '../../domain';
import { formatarLeadsParaCsv } from './formatar-leads-csv';
import { ListarLeadsUseCase } from './listar-leads.use-case';

/**
 * Caso de uso de `GET /api/admin/leads/export.csv?from=&to=` (autenticado):
 * mesma listagem/filtro de `ListarLeadsUseCase` — reaproveitada aqui via
 * injeção, em vez de repetir a chamada ao repositório, para a consulta ter
 * uma única fonte de verdade (G5/DRY, `references/clean-code.md`) — só o
 * formato de saída muda (CSV via `formatarLeadsParaCsv`, em vez do JSON
 * default do Nest).
 */
@Injectable()
export class ExportarLeadsCsvUseCase {
  constructor(
    @Inject(ListarLeadsUseCase)
    private readonly listarLeads: ListarLeadsUseCase,
  ) {}

  async executar(filtro?: FiltroPeriodoLeads): Promise<string> {
    const leads = await this.listarLeads.executar(filtro);
    return formatarLeadsParaCsv(leads);
  }
}
