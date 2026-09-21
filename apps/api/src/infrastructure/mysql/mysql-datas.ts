/**
 * Conversão entre o formato `DATETIME` do MySQL (`YYYY-MM-DD HH:MM:SS`, lido
 * como string crua graças a `dateStrings: true` em `mysql-client.factory.ts`)
 * e ISO 8601 (formato usado pelas portas do Domínio — ver `SecaoPersistida`,
 * `LeadPersistido`, `SiteMetadataPersistido`).
 *
 * Toda escrita da aplicação já grava em UTC (SDD § Modelo de dados:
 * "timestamptz -> DATETIME em UTC, padronizado na aplicação") — por isso a
 * conversão aqui é puramente textual (troca de separador, sem cálculo de
 * fuso horário): o valor lido do banco já É UTC.
 */

/** Agora, formatado como `DATETIME` do MySQL, em UTC — para gravar em `updated_at`/`created_at`. */
export function agoraMysqlUtc(): string {
  return paraMysqlDatetime(new Date().toISOString());
}

/** Um `DATETIME` do MySQL (`YYYY-MM-DD HH:MM:SS`) convertido para ISO 8601 UTC. */
export function paraIsoUtc(valorMysql: string): string {
  return `${valorMysql.replace(' ', 'T')}.000Z`;
}

/** Uma data ISO 8601 (ex. filtro de período, `FiltroPeriodoLeads`) convertida para `DATETIME` do MySQL. */
export function paraMysqlDatetime(valorIso: string): string {
  return new Date(valorIso).toISOString().slice(0, 19).replace('T', ' ');
}
