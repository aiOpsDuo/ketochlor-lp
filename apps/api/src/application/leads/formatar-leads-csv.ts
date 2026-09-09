import type { LeadPersistido } from '../../domain';

/** Ordem das colunas do CSV — mesmos nomes de campo da resposta JSON (`LeadPersistido`), para quem já conhece a API não precisar aprender um segundo vocabulário de coluna. */
const COLUNAS: Array<keyof LeadPersistido> = [
  'id',
  'nome',
  'email',
  'telefone',
  'crmv',
  'estadoCidade',
  'especialidade',
  'jaClienteVirbac',
  'desejaContatoComercial',
  'origem',
  'createdAt',
];

/** Quebra de linha padrão de CSV (RFC 4180) — `\r\n`, não só `\n`. */
const QUEBRA_DE_LINHA_CSV = '\r\n';

/**
 * Escapa um valor para uso como campo CSV (RFC 4180, simplificado): `null`/
 * `undefined` viram string vazia; um valor que contém vírgula, aspas ou
 * quebra de linha é envolvido em aspas duplas, com toda aspas dupla interna
 * duplicada (`"` → `""`) — a mesma regra que qualquer planilha (Excel,
 * Google Sheets, LibreOffice) espera ao importar o arquivo.
 */
function escaparCampoCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  const precisaDeAspas = /["\r\n,]/.test(texto);
  if (!precisaDeAspas) {
    return texto;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Formata leads como CSV: uma linha de cabeçalho com o nome de cada coluna,
 * depois uma linha por lead — usado por `GET /api/admin/leads/export.csv`
 * (`ExportarLeadsCsvUseCase`).
 *
 * **Decisão de implementação (tarefa `api/modulo-leads`): função própria de
 * poucas linhas, sem biblioteca externa de CSV.** O formato de saída é fixo e
 * conhecido em tempo de compilação (as colunas de `LeadPersistido`, sem
 * aninhamento, sem necessidade de fazer o caminho inverso — parsing de CSV de
 * volta a objeto), então a única responsabilidade real é "escrever
 * vírgula/aspas/quebra de linha com segurança" (`escaparCampoCsv` acima) —
 * poucas linhas resolvem isso por completo (RFC 4180). Adicionar uma
 * dependência nova a `apps/api` só para isso duplicaria, com uma biblioteca
 * inteira, o que uma função pura já cobre — mesmo raciocínio de
 * proporcionalidade já aplicado por `validarLead`/`validarSiteMetadata` ao
 * decidir não trazer `class-validator` para payloads pequenos sem esquema
 * compartilhado.
 */
export function formatarLeadsParaCsv(leads: LeadPersistido[]): string {
  const cabecalho = COLUNAS.join(',');
  const linhas = leads.map((lead) => COLUNAS.map((coluna) => escaparCampoCsv(lead[coluna])).join(','));
  return [cabecalho, ...linhas].join(QUEBRA_DE_LINHA_CSV) + QUEBRA_DE_LINHA_CSV;
}
