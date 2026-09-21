import { hash } from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import type { Operador } from '../../domain/operators/operador';
import type {
  OperadorComCredenciais,
  OperadorCredenciaisRepository,
} from '../../domain/portas/operador-credenciais.repository';
import type { EmissorToken } from '../../domain/portas/emissor-token';
import { LoginUseCase } from './login.use-case';

/**
 * Repositório falso (em memória), só para este teste de unidade — os testes
 * de INTEGRAÇÃO reais contra MySQL ficam em
 * `infrastructure/mysql/operadores.repository.test.ts`, e o e2e completo do
 * endpoint em `presentation/auth/auth-login.e2e.test.ts`. Mesmo padrão de
 * `remover-operador.use-case.test.ts`.
 */
class OperadorCredenciaisRepositoryFalso implements OperadorCredenciaisRepository {
  public ultimoLoginAtualizadoPara: string | null = null;

  constructor(private readonly credenciaisPorEmail: Map<string, OperadorComCredenciais>) {}

  async buscarPorEmail(email: string): Promise<OperadorComCredenciais | null> {
    return this.credenciaisPorEmail.get(email) ?? null;
  }

  async atualizarUltimoLogin(id: string): Promise<void> {
    this.ultimoLoginAtualizadoPara = id;
  }
}

/** Emissor falso — devolve um token previsível, só para o teste checar que FOI chamado com o `sub` certo. */
class EmissorTokenFalso implements EmissorToken {
  public claimsRecebidas: Record<string, unknown> | null = null;

  async emitir(claims: Record<string, unknown> & { sub: string }): Promise<string> {
    this.claimsRecebidas = claims;
    return `token-fake-para-${claims.sub}`;
  }
}

const SENHA_CORRETA = 'senha-correta-123456';

async function criarRepositorioComOperador(): Promise<{
  repositorio: OperadorCredenciaisRepositoryFalso;
  operador: Operador;
}> {
  const operador: Operador = {
    id: 'operador-1',
    email: 'ana.souza@example.com',
    nome: 'Ana Souza',
    criadoEm: '2026-01-01T00:00:00.000Z',
    ultimoLoginEm: null,
  };
  const senhaHash = await hash(SENHA_CORRETA, 4); // custo baixo — só teste, velocidade importa mais que segurança aqui
  const mapa = new Map<string, OperadorComCredenciais>([[operador.email, { operador, senhaHash }]]);
  return { repositorio: new OperadorCredenciaisRepositoryFalso(mapa), operador };
}

describe('LoginUseCase', () => {
  it('devolve accessToken, grava ultimoLoginEm e emite o token com sub = operador.id, quando a senha confere', async () => {
    const { repositorio, operador } = await criarRepositorioComOperador();
    const emissor = new EmissorTokenFalso();
    const useCase = new LoginUseCase(repositorio, emissor);

    const resultado = await useCase.executar({ email: operador.email, senha: SENHA_CORRETA });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.accessToken).toBe(`token-fake-para-${operador.id}`);
    }
    expect(repositorio.ultimoLoginAtualizadoPara).toBe(operador.id);
    expect(emissor.claimsRecebidas).toMatchObject({ sub: operador.id, email: operador.email });
  });

  it('recusa com "credenciais-invalidas" quando o e-mail não existe', async () => {
    const { repositorio } = await criarRepositorioComOperador();
    const emissor = new EmissorTokenFalso();
    const useCase = new LoginUseCase(repositorio, emissor);

    const resultado = await useCase.executar({
      email: 'nao.existe@example.com',
      senha: SENHA_CORRETA,
    });

    expect(resultado).toEqual({ sucesso: false, motivo: 'credenciais-invalidas' });
    expect(repositorio.ultimoLoginAtualizadoPara).toBeNull();
    expect(emissor.claimsRecebidas).toBeNull();
  });

  it('recusa com "credenciais-invalidas" — MESMO motivo/formato do e-mail inexistente — quando a senha está errada', async () => {
    const { repositorio, operador } = await criarRepositorioComOperador();
    const emissor = new EmissorTokenFalso();
    const useCase = new LoginUseCase(repositorio, emissor);

    const resultado = await useCase.executar({ email: operador.email, senha: 'senha-errada' });

    expect(resultado).toEqual({ sucesso: false, motivo: 'credenciais-invalidas' });
    expect(repositorio.ultimoLoginAtualizadoPara).toBeNull();
    expect(emissor.claimsRecebidas).toBeNull();
  });

  it('devolve "validacao" (nunca chega a consultar o repositório) para um corpo sem email/senha', async () => {
    const { repositorio } = await criarRepositorioComOperador();
    const buscarPorEmailSpy = vi.spyOn(repositorio, 'buscarPorEmail');
    const emissor = new EmissorTokenFalso();
    const useCase = new LoginUseCase(repositorio, emissor);

    const resultado = await useCase.executar({ email: '', senha: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.motivo).toBe('validacao');
    }
    expect(buscarPorEmailSpy).not.toHaveBeenCalled();
  });
});
