import { atualizar, requisitar } from "./api.ts";

/** Formato devolvido por GET /monitoring-settings (rota protegida por JWT). */
export interface ConfiguracaoMonitoramento {
  intervaloColetaSegundos: number;
}

/** Limites aceitos pela tela. O mínimo de 10 s é o mesmo que o backend já exige em POST /collections/rotina. */
export const INTERVALO_MIN_SEGUNDOS = 10;
// TODO(TP19): confirmar o limite máximo com quem fizer o endpoint. 86400 s (24 h) é uma suposição desta tela.
export const INTERVALO_MAX_SEGUNDOS = 86_400;

/** Lê o intervalo de coleta atual. Lança `ErroApi` (401 sem token válido, 5xx...) ou `Error` se a resposta vier fora do formato. */
export async function buscarIntervaloColeta(signal?: AbortSignal): Promise<number> {
  const resposta = await requisitar<ConfiguracaoMonitoramento>("/monitoring-settings", signal);
  const valor = resposta.intervaloColetaSegundos;
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error("Resposta de configuração fora do formato esperado.");
  }
  return valor;
}

/**
 * Altera o intervalo de coleta.
 *
 * TODO(TP19): o backend ainda só tem `GET /monitoring-settings` (valor fixo em 60, sem banco).
 * Esta função já chama `PUT /monitoring-settings` com `{ "intervaloColetaSegundos": <número> }`.
 * Quando a TP19 for entregue, confirme o método (PUT ou PATCH) e o corpo; se mudarem, ajuste só aqui.
 * Até lá o servidor responde 404, e a tela mostra um aviso em vez de quebrar.
 */
export async function salvarIntervaloColeta(segundos: number, signal?: AbortSignal): Promise<void> {
  await atualizar("/monitoring-settings", { intervaloColetaSegundos: segundos }, signal);
}
