import { Body, Controller, HttpStatus, Inject, Post, UnprocessableEntityException } from '@nestjs/common';
import { EmitirCredencialUploadUseCase } from '../../application/media/emitir-credencial-upload.use-case';
import { ADMIN_SEGMENT } from '../auth/route-prefixes';
import type { EmitirCredencialUploadDto } from './emitir-credencial-upload.dto';

/**
 * Rota administrativa de mídia (SDD § Contratos de dados/API/interfaces —
 * `POST /api/admin/media/upload-url`), sob `/api/admin/media`, portanto já
 * protegida pelo `AuthGuard` global (ver `presentation/auth/auth.guard.ts`)
 * sem precisar de `@UseGuards` aqui — mesmo padrão de
 * `MetadataAdminController`/`ContentAdminController`.
 *
 * **Única rota deste módulo, de propósito (SDD § Decisões técnicas e
 * trade-offs — "Upload direto do navegador para o Storage").** O upload dos
 * bytes em si vai direto do navegador ao Supabase Storage usando a
 * credencial devolvida aqui — a API nunca recebe o arquivo. A confirmação do
 * registro em `media_assets` depois que o upload termina
 * (`MediaAssetsRepository.criar`, SDD § Riscos técnicos — "Upload de imagem
 * interrompido no meio do envio") não tem rota própria nesta tarefa: nenhum
 * contrato do SDD declara um segundo endpoint para isso, e antecipar um sem
 * um consumidor real (painel) seria over-engineering — fica para a tarefa
 * que de fato liga o formulário de imagem do painel a esse fluxo.
 *
 * Nenhuma regra de negócio neste controller — só tradução HTTP↔caso de uso.
 */
@Controller(`${ADMIN_SEGMENT}/media`)
export class MediaAdminController {
  // `@Inject(ClasseDoCasoDeUso)` explícito — ver comentário de decisão em
  // `presentation/content/content-public.controller.ts` (o Vitest, via
  // esbuild, não emite `design:paramtypes`).
  constructor(
    @Inject(EmitirCredencialUploadUseCase)
    private readonly emitirCredencialUpload: EmitirCredencialUploadUseCase,
  ) {}

  @Post('upload-url')
  async emitirUrlDeUpload(@Body() body: EmitirCredencialUploadDto) {
    const resultado = await this.emitirCredencialUpload.executar(body);

    if (!resultado.sucesso) {
      // Mesmo formato de erro de `MetadataAdminController.atualizar`:
      // `statusCode` explícito porque passar um objeto para
      // `UnprocessableEntityException` o usa COMO O CORPO INTEIRO da
      // resposta, sem injetar `statusCode` automaticamente.
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Dados inválidos para a solicitação de upload de mídia.',
        erros: resultado.erros,
      });
    }

    const { credencial } = resultado;
    return {
      mediaAssetId: credencial.mediaAssetId,
      storagePath: credencial.storagePath,
      signedUrl: credencial.signedUrl,
      token: credencial.token,
    };
  }
}
