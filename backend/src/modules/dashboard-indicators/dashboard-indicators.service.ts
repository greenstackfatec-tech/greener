/**
 * Service para indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import { buscarIndicadoresConsolidados, type IndicadoresConsolidados } from "./dashboard-indicators.repository.ts";

/** Indicadores formatados para resposta da API. */
export interface IndicadoresDashboard {
  consumo_total_kwh: number;
  emissao_total_co2e_g: number;
  servicos_ativos: number;
  servicos_indisponiveis: number;
}

/**
 * Busca os indicadores consolidados formatados para o dashboard.
 * @returns Indicadores formatados
 */
export async function obterIndicadoresDashboard(): Promise<IndicadoresDashboard> {
  const indicadores = await buscarIndicadoresConsolidados();

  // Arredonda para 8 casas decimais (precisão do schema do banco)
  const arredondar8 = (valor: number): number => Number(valor.toFixed(8));

  return {
    consumo_total_kwh: arredondar8(indicadores.consumoTotalKwh),
    emissao_total_co2e_g: arredondar8(indicadores.emissaoTotalCo2eG),
    servicos_ativos: indicadores.servicosAtivos,
    servicos_indisponiveis: indicadores.servicosIndisponiveis,
  };
}