import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Put,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AtualizarMetadataUseCase } from '../../application/metadata/atualizar-metadata.use-case';
import { ConsultarMetadataUseCase } from '../../application/metadata/consultar-metadata.use-case';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';
import type { AtualizarMetadataDto } from './atualizar-metadata.dto';

/**
 * Rotas administrativas de metadados (SDD § Contratos de dados/API/interfaces
 * — `GET`/`PUT /api/admin/metadata`), sob `/api/admin/metadata`, portanto já
 * protegidas pelo `AuthGuard` global (ver `presentation/auth/auth.guard.ts`)
 * sem precisar de `@UseGuards` aqui — mesmo padrão de `ContentAdminController`.
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso.
 */
@Controller(`${ADMIN_SEGMENT}/metadata`)
export class MetadataAdminController {
  // `@Inject(ClasseDoCasoDeUso)` explícito — ver comentário de decisão em
  // `presentation/content/content-public.controller.ts` (o Vitest, via
  // esbuild, não emite `design:paramtypes`).
  constructor(
    @Inject(ConsultarMetadataUseCase)
    private readonly consultarMetadata: ConsultarMetadataUseCase,
    @Inject(AtualizarMetadataUseCase)
    private readonly atualizarMetadata: AtualizarMetadataUseCase,
  ) {}

  @Get()
  async obter() {
    return this.consultarMetadata.executar();
  }

  @Put()
  async atualizar(@Body() body: AtualizarMetadataDto, @Req() request: Request) {
    // `request.usuario` é anexado pelo `AuthGuard` — sempre presente aqui,
    // porque esta rota está sob `/api/admin` (mesmo comentário de
    // `ContentAdminController.atualizar`).
    const updatedBy = request.usuario?.sub ?? null;

    const resultado = await this.atualizarMetadata.executar(body, updatedBy);

    if (!resultado.sucesso) {
      // Mesmo formato de erro de `ContentAdminController.atualizar`:
      // `statusCode` explícito porque passar um objeto para
      // `UnprocessableEntityException` o usa COMO O CORPO INTEIRO da
      // resposta, sem injetar `statusCode` automaticamente.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Dados inválidos para os metadados do site.',
        erros: resultado.erros,
      });
    }
    return resultado.metadata;
  }
}
