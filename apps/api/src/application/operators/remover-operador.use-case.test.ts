import { describe, expect, it } from 'vitest';
import { RemocaoOperadorRecusadaError } from '../../domain';
import type { CriarOperadorInput, Operador, OperadoresRepository } from '../../domain';
import { RemoverOperadorUseCase } from './remover-operador.use-case';

/**
 * Repositório falso (em memória), só para este teste de unidade — os testes
 * e2e reais de `OperatorsAdminController` (`operators.e2e.test.ts`) cobrem o
 * caminho de ponta a ponta contra o Supabase local de verdade. Este teste
 * existe para exercitar isoladamente o ramo `'ultimo-operador'` de
 * `RemoverOperadorUseCase`, que — como o comentário da classe explica — não é
 * alcançável via HTTP real: quem chama a API só tem um JWT válido se é, ele
 * mesmo, um operador existente, então uma lista de tamanho 1 nunca contém um
 * alvo diferente do próprio chamador em uso normal (o caso `'proprio'` sempre
 * intercepta primeiro). Um repositório falso permite construir esse estado
 * mesmo assim, para provar que o código do ramo está correto.
 */
class OperadoresRepositoryFalso implements OperadoresRepository {
  constructor(private operadores: Operador[]) {}

  async listarTodos(): Promise<Operador[]> {
    return this.operadores;
  }

  async criar(input: CriarOperadorInput): Promise<Operador> {
    throw new Error(`Não usado neste teste: ${input.email}`);
  }

  async remover(id: string): Promise<void> {
    this.operadores = this.operadores.filter((operador) => operador.id !== id);
  }
}

// Data fixa: evita que duas chamadas a `operador(...)` no mesmo teste
// produzam `criadoEm` diferentes por milissegundos (o que quebraria uma
// comparação por igualdade profunda do objeto inteiro).
const CRIADO_EM_FIXO = '2026-01-01T00:00:00.000Z';

function operador(id: string): Operador {
  return { id, email: `${id}@example.com`, nome: id, criadoEm: CRIADO_EM_FIXO, ultimoLoginEm: null };
}

describe('RemoverOperadorUseCase', () => {
  it('recusa remover a própria conta com RemocaoOperadorRecusadaError("proprio")', async () => {
    const repositorio = new OperadoresRepositoryFalso([operador('a'), operador('b')]);
    const useCase = new RemoverOperadorUseCase(repositorio);

    await expect(useCase.executar('a', 'a')).rejects.toThrow(RemocaoOperadorRecusadaError);
    try {
      await useCase.executar('a', 'a');
      expect.unreachable('deveria ter lançado RemocaoOperadorRecusadaError');
    } catch (erro) {
      expect(erro).toBeInstanceOf(RemocaoOperadorRecusadaError);
      expect((erro as RemocaoOperadorRecusadaError).motivo).toBe('proprio');
    }
  });

  it('devolve false quando o id alvo não corresponde a nenhum operador existente', async () => {
    const repositorio = new OperadoresRepositoryFalso([operador('a'), operador('b')]);
    const useCase = new RemoverOperadorUseCase(repositorio);

    await expect(useCase.executar('inexistente', 'a')).resolves.toBe(false);
  });

  it('recusa remover o único operador restante com RemocaoOperadorRecusadaError("ultimo-operador")', async () => {
    // Estado só possível de construir com um repositório falso (ver
    // comentário da classe acima): lista de tamanho 1 cujo único operador NÃO
    // é quem está chamando — em produção isso nunca acontece porque o
    // chamador precisaria de um JWT válido de um operador que não está na
    // própria listagem de operadores.
    const repositorio = new OperadoresRepositoryFalso([operador('unico')]);
    const useCase = new RemoverOperadorUseCase(repositorio);

    try {
      await useCase.executar('unico', 'outro-id-que-nao-esta-na-lista');
      expect.unreachable('deveria ter lançado RemocaoOperadorRecusadaError');
    } catch (erro) {
      expect(erro).toBeInstanceOf(RemocaoOperadorRecusadaError);
      expect((erro as RemocaoOperadorRecusadaError).motivo).toBe('ultimo-operador');
    }
  });

  it('remove com sucesso quando há mais de um operador e o alvo não é o próprio chamador', async () => {
    const repositorio = new OperadoresRepositoryFalso([operador('a'), operador('b')]);
    const useCase = new RemoverOperadorUseCase(repositorio);

    await expect(useCase.executar('b', 'a')).resolves.toBe(true);
    await expect(repositorio.listarTodos()).resolves.toEqual([operador('a')]);
  });
});
