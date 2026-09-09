import { Inject, Injectable } from '@nestjs/common';
import type { LeadsRepository } from '../../domain';
import { LEADS_REPOSITORY } from './leads-repository.token';

/**
 * Caso de uso de `DELETE /api/admin/leads/:id` (autenticado). Delega a
 * `LeadsRepository.excluir`, que devolve `true`/`false` conforme um registro
 * existia ou não para aquele `id` (ver comentário de decisão na porta,
 * `domain/portas/leads.repository.ts`) — a Apresentação traduz `false` para
 * `404` (SDD § Contratos de dados/API/interfaces).
 */
@Injectable()
export class ExcluirLeadUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly repositorio: LeadsRepository,
  ) {}

  async executar(id: string): Promise<boolean> {
    return this.repositorio.excluir(id);
  }
}
