import { Body, Controller, HttpStatus, Inject, Post, UnprocessableEntityException } from '@nestjs/common';
import { RegistrarLeadUseCase } from '../../application/leads/registrar-lead.use-case';
import type { RegistrarLeadDto } from './registrar-lead.dto';

/**
 * `POST /api/leads` (SDD § Contratos de dados/API/interfaces — Leads, sem
 * autenticação).
 *
 * Fica fora de `/api/admin/*` de propósito, mesmo raciocínio de
 * `ContentPublicController` (`GET /api/content`): `AuthGuard` (registrado
 * globalmente por `AuthModule`) só exige token para requisições cujo caminho
 * comece com `/api/admin` — este controller nunca precisa de `@UseGuards`
 * nem de qualquer anotação extra para permanecer público, basta não
 * registrar sua rota sob aquele prefixo (confirmado por teste e2e,
 * `leads.e2e.test.ts`, não presumido).
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso.
 */
@Controller('leads')
export class LeadsPublicController {
  // `@Inject(ClasseDoCasoDeUso)` explícito — ver comentário de decisão em
  // `presentation/content/content-public.controller.ts` (o Vitest, via
  // esbuild, não emite `design:paramtypes`).
  constructor(
    @Inject(RegistrarLeadUseCase)
    private readonly registrarLead: RegistrarLeadUseCase,
  ) {}

  @Post()
  async registrar(@Body() body: RegistrarLeadDto) {
    const resultado = await this.registrarLead.executar(body);

    if (!resultado.sucesso) {
      // Mesmo formato de erro de `MetadataAdminController.atualizar`:
      // `statusCode` explícito porque passar um objeto para
      // `UnprocessableEntityException` o usa COMO O CORPO INTEIRO da
      // resposta, sem injetar `statusCode` automaticamente.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Dados inválidos para o envio do formulário de Material Técnico.',
        erros: resultado.erros,
      });
    }
    return resultado.lead;
  }
}
