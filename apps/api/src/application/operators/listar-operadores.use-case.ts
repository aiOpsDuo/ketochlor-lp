import { Inject, Injectable } from '@nestjs/common';
import type { Operador, OperadoresRepository } from '../../domain';
import { OPERADORES_REPOSITORY } from './operadores-repository.token';

/**
 * Caso de uso de `GET /api/admin/operators` (autenticado). Ordena por
 * `criadoEm` decrescente (mais recente primeiro) — mesmo critério de
 * exibição de `ListarLeadsUseCase`/`LeadsRepository.listarPorPeriodo` (`ORDER
 * BY created_at DESC`), aqui reordenado na Aplicação em vez de na
 * Infraestrutura porque a Admin API do Supabase Auth
 * (`auth.admin.listUsers`) não garante nenhuma ordem específica de
 * devolução.
 */
@Injectable()
export class ListarOperadoresUseCase {
  constructor(
    @Inject(OPERADORES_REPOSITORY)
    private readonly repositorio: OperadoresRepository,
  ) {}

  async executar(): Promise<Operador[]> {
    const operadores = await this.repositorio.listarTodos();
    return [...operadores].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }
}
