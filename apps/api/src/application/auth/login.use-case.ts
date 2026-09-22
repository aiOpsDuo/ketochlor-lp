import { Inject, Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { validarLogin } from '../../domain/auth/validar-login';
import type { LoginPayloadBruto } from '../../domain/auth/validar-login';
import type { ErroValidacaoCampo } from '../../domain/shared/resultado-validacao';
import type { EmissorToken } from '../../domain/portas/emissor-token';
import type { OperadorCredenciaisRepository } from '../../domain/portas/operador-credenciais.repository';
import { EMISSOR_TOKEN } from './emissor-token.token';
import { OPERADOR_CREDENCIAIS_REPOSITORY } from './operador-credenciais-repository.token';

export type ResultadoLogin =
  | { sucesso: true; accessToken: string }
  | { sucesso: false; motivo: 'validacao'; erros: ErroValidacaoCampo[] }
  | { sucesso: false; motivo: 'credenciais-invalidas' };

/**
 * Hash `bcryptjs` fixo de uma senha que não corresponde a nenhuma conta real
 * — usado só para COMPARAR contra quando `buscarPorEmail` devolve `null`
 * (e-mail inexistente), para que o tempo de resposta de "e-mail não existe"
 * fique no mesmo patamar de "e-mail existe, senha errada" (`bcryptjs.compare`
 * é a operação cara aqui; pular a chamada de todo quando o e-mail não existe
 * criaria um oráculo de tempo trivial, revelando quais e-mails têm conta —
 * exatamente o que o contrato "mesma mensagem/401 nos dois casos" exige
 * evitar). Não é o hash de senha de nenhum operador real.
 */
const HASH_FALSO_PARA_TIMING_CONSTANTE =
  '$2b$12$rd3QWE8XeVBs6wpJfpoVBuffdPzHIvmnA.6Pzqk0Q5pLkHCdZgQVG';

/**
 * Caso de uso de `POST /api/auth/login` (SDD § Contratos de dados/API/
 * interfaces — Autenticação; PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`) — a API emite e verifica sua
 * própria sessão, sem depender de nenhum serviço de terceiro.
 *
 * Fluxo: valida o formato do corpo (Domínio, `validarLogin`) → busca o
 * operador pelo e-mail junto do hash de senha (`OperadorCredenciaisRepository`,
 * porta dedicada — ver seu comentário de decisão) → compara a senha recebida
 * contra o hash com `bcryptjs.compare` → se conferir, grava `ultimoLoginEm` e
 * emite um JWT (`EmissorToken`, `sub = operador.id`).
 *
 * Falha de credencial (e-mail inexistente OU senha errada) devolve sempre
 * `{ sucesso: false, motivo: 'credenciais-invalidas' }` — a Apresentação
 * traduz para `401` com a MESMA mensagem genérica nos dois casos (SDD:
 * "nunca revele se o e-mail existe").
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(OPERADOR_CREDENCIAIS_REPOSITORY)
    private readonly repositorio: OperadorCredenciaisRepository,
    @Inject(EMISSOR_TOKEN)
    private readonly emissor: EmissorToken,
  ) {}

  async executar(payload: LoginPayloadBruto): Promise<ResultadoLogin> {
    const validacao = validarLogin(payload);
    if (!validacao.sucesso) {
      return { sucesso: false, motivo: 'validacao', erros: validacao.erros };
    }

    const credenciais = await this.repositorio.buscarPorEmail(validacao.dado.email);
    const senhaConfere = await compare(
      validacao.dado.senha,
      credenciais?.senhaHash ?? HASH_FALSO_PARA_TIMING_CONSTANTE,
    );

    if (!credenciais || !senhaConfere) {
      return { sucesso: false, motivo: 'credenciais-invalidas' };
    }

    await this.repositorio.atualizarUltimoLogin(credenciais.operador.id);
    const accessToken = await this.emissor.emitir({
      sub: credenciais.operador.id,
      email: credenciais.operador.email,
    });

    return { sucesso: true, accessToken };
  }
}
