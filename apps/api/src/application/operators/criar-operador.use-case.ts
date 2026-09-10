import { Inject, Injectable } from '@nestjs/common';
import type { CriarOperadorPayloadBruto, ErroValidacaoCampo, Operador, OperadoresRepository } from '../../domain';
import { validarCriacaoOperador } from '../../domain';
import { OPERADORES_REPOSITORY } from './operadores-repository.token';

export type ResultadoCriacaoOperador =
  | { sucesso: true; operador: Operador }
  | { sucesso: false; erros: ErroValidacaoCampo[] };

/**
 * Caso de uso de `POST /api/admin/operators` (autenticado). Nenhuma regra de
 * negócio aqui além de orquestrar: valida o corpo via `validarCriacaoOperador`
 * (Domínio) ANTES de criar a conta no Supabase Auth — o controller nunca
 * chama o repositório diretamente, mesmo padrão de `AtualizarMetadataUseCase`.
 */
@Injectable()
export class CriarOperadorUseCase {
  constructor(
    @Inject(OPERADORES_REPOSITORY)
    private readonly repositorio: OperadoresRepository,
  ) {}

  /**
   * @returns `{ sucesso: false, erros }` se `nome`/`email`/`senha` forem
   * inválidos (a Apresentação traduz para `422`); caso contrário, o operador
   * recém-criado, já pronto para logar (`email_confirm: true` na
   * Infraestrutura).
   */
  async executar(input: CriarOperadorPayloadBruto): Promise<ResultadoCriacaoOperador> {
    const validacao = validarCriacaoOperador(input);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    const operador = await this.repositorio.criar(validacao.dado);
    return { sucesso: true, operador };
  }
}
