/**
 * Repository para configurações do sistema (tabela configuracoes).
 */
import { consultar } from "../../db/connection.ts";

/**
 * Busca uma configuração por chave.
 * @param chave Chave da configuração
 * @param valorPadrao Valor caso a chave não exista
 */
export async function buscarConfiguracao(
  chave: string,
  valorPadrao: string,
): Promise<string> {
  const sql = "SELECT valor FROM configuracoes WHERE chave = $1";
  const resultado = await consultar<{ valor: string }>(sql, [chave]);
  return resultado.rows.length > 0 ? resultado.rows[0].valor : valorPadrao;
}

/**
 * Busca o intervalo de coleta em segundos.
 */
export async function buscarIntervaloColetaSegundos(): Promise<number> {
  const valor = await buscarConfiguracao("intervalo_coleta_segundos", "60");
  return Number(valor);
}
