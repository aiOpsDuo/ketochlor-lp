import { Inject, Injectable } from '@nestjs/common';
import { RemocaoOperadorRecusadaError, type OperadoresRepository } from '../../domain';
import { OPERADORES_REPOSITORY } from './operadores-repository.token';

/**
 * Caso de uso de `DELETE /api/admin/operators/:id` (autenticado). Duas
 * invariantes checadas ANTES de chamar `OperadoresRepository.remover` —
 * as duas travariam o próprio acesso administrativo ao painel (PLAN.md,
 * tarefa `ajustes/modulo-operadores`):
 *
 * 1. **Própria conta**: `idAlvo === idOperadorAtual` (o id do operador do
 *    token, `request.usuario.sub`) lança `RemocaoOperadorRecusadaError`
 *    (`'proprio'`) — checado primeiro porque não depende de nenhuma chamada
 *    extra à Admin API.
 * 2. **Último operador restante**: se, entre TODOS os operadores existentes,
 *    sobrar só 1 (e ele é o alvo — a única forma de o alvo existir numa lista
 *    de tamanho 1 sem cair no caso 1 acima seria uma inconsistência entre o
 *    operador do token e a Admin API), lança `RemocaoOperadorRecusadaError`
 *    (`'ultimo-operador'`). Verificação defensiva mantida mesmo sabendo que,
 *    em uso normal do painel, o caso 1 já a cobre (quem chama só tem um JWT
 *    válido se é, ele mesmo, um operador existente) — ver
 *    `remover-operador.use-case.test.ts` para o cenário isolado que exercita
 *    este ramo diretamente.
 *
 * Segue o mesmo padrão de `ExcluirLeadUseCase`/`LeadsAdminController` para
 * "alvo não encontrado": devolve `false` (não lança), e é a Apresentação
 * quem traduz para `404`.
 */
@Injectable()
export class RemoverOperadorUseCase {
  constructor(
    @Inject(OPERADORES_REPOSITORY)
    private readonly repositorio: OperadoresRepository,
  ) {}

  /** @returns `false` se `idAlvo` não corresponde a nenhum operador existente; `true` após remover com sucesso. */
  async executar(idAlvo: string, idOperadorAtual: string): Promise<boolean> {
    if (idAlvo === idOperadorAtual) {
      throw new RemocaoOperadorRecusadaError('proprio');
    }

    const operadores = await this.repositorio.listarTodos();
    const alvoExiste = operadores.some((operador) => operador.id === idAlvo);
    if (!alvoExiste) {
      return false;
    }

    if (operadores.length === 1) {
      throw new RemocaoOperadorRecusadaError('ultimo-operador');
    }

    await this.repositorio.remover(idAlvo);
    return true;
  }
}
