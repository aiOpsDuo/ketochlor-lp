import { Inject, Injectable } from '@nestjs/common';
import type { FiltroPeriodoLeads, LeadPersistido, LeadsRepository } from '../../domain';
import { LEADS_REPOSITORY } from './leads-repository.token';

/**
 * Caso de uso de `GET /api/admin/leads?from=&to=` (autenticado): devolve os
 * leads, mais recente primeiro, com filtro de período opcional. Nenhuma
 * regra de negócio própria além de delegar ao repositório —
 * `LeadsRepository.listarPorPeriodo` (Infraestrutura) já resolve ordenação e
 * filtro na própria consulta ao Postgres, não há nada para o Domínio decidir
 * aqui (diferente de conteúdo, não existe conceito de "lead não publicado" a
 * filtrar).
 *
 * Reaproveitado por `ExportarLeadsCsvUseCase` (mesma consulta; a única
 * diferença é o formato de saída) — ver comentário de decisão naquele caso de
 * uso.
 */
@Injectable()
export class ListarLeadsUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly repositorio: LeadsRepository,
  ) {}

  async executar(filtro?: FiltroPeriodoLeads): Promise<LeadPersistido[]> {
    return this.repositorio.listarPorPeriodo(filtro);
  }
}
