import { requisitar } from "./api.ts";

/** Indicadores consolidados do ambiente, já com os nomes usados no frontend. */
export interface Indicadores {
  consumoTotalKwh: number;
  emissaoTotalCo2eG: number;
  servicosAtivos: number;
  servicosIndisponiveis: number;
}

/** Formato devolvido por `GET /dashboard/indicadores` (backend, TP10). */
interface IndicadoresApi {
  consumo_total_kwh: unknown;
  emissao_total_co2e_g: unknown;
  servicos_ativos: unknown;
  servicos_indisponiveis: unknown;
}

function exigirNumero(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    // Resposta fora do contrato: não inventamos zero, deixamos a tela mostrar o erro.
    throw new Error(`Resposta de indicadores inválida: "${campo}" ausente ou não numérico.`);
  }
  return valor;
}

/** GET /api/dashboard/indicadores. Rota pública, não exige login. */
export async function consultarIndicadores(signal?: AbortSignal): Promise<Indicadores> {
  const bruto = await requisitar<IndicadoresApi>("/dashboard/indicadores", signal);
  return {
    consumoTotalKwh: exigirNumero(bruto.consumo_total_kwh, "consumo_total_kwh"),
    emissaoTotalCo2eG: exigirNumero(bruto.emissao_total_co2e_g, "emissao_total_co2e_g"),
    servicosAtivos: exigirNumero(bruto.servicos_ativos, "servicos_ativos"),
    servicosIndisponiveis: exigirNumero(bruto.servicos_indisponiveis, "servicos_indisponiveis"),
  };
}