/**
 * Service para consultas analíticas (BD06).
 * Camada de negócio entre controller e repository.
 */

import {
  buscarHistoricoPorServico,
  buscarRankingPorMetrica,
  compararServicos,
  agregarMetricas,
  type HistoricoItem,
  type RankingItem,
  type ComparacaoServico,
  type FiltroPeriodo,
  type FiltroServico,
  type OpcoesOrdenacao,
  type OpcoesPaginacao,
  type MetricaRanking,
  type AgregacaoParametrizada,
  type ColunaAgregavel,
  type FuncaoAgregacao,
} from "./analytics.repository.ts";

/* ---------- Re-export types ---------- */

export type { HistoricoItem, RankingItem, ComparacaoServico, MetricaRanking, ColunaAgregavel, FuncaoAgregacao };

/* ---------- Histórico ---------- */

export interface HistoricoFiltros extends FiltroPeriodo, OpcoesOrdenacao, OpcoesPaginacao {}

export async function obterHistoricoServico(
  servicoId: number,
  filtros: HistoricoFiltros = {},
): Promise<HistoricoItem[]> {
  return buscarHistoricoPorServico(servicoId, filtros);
}

/* ---------- Ranking ---------- */

export interface RankingFiltros extends FiltroPeriodo, FiltroServico, OpcoesPaginacao {}

export async function obterRanking(
  metrica: MetricaRanking,
  filtros: RankingFiltros = {},
): Promise<RankingItem[]> {
  return buscarRankingPorMetrica(metrica, filtros);
}

/* ---------- Comparação ---------- */

export interface ComparacaoFiltros extends FiltroPeriodo {}

export async function obterComparacaoServicos(
  servicoIds: number[],
  filtros: ComparacaoFiltros = {},
): Promise<ComparacaoServico[]> {
  return compararServicos(servicoIds, filtros);
}

/* ---------- Agregações customizadas ---------- */

export interface AgregacaoFiltros extends AgregacaoParametrizada {}

export async function obterAgregacaoMetricas(
  params: AgregacaoFiltros,
): Promise<Record<string, unknown>[]> {
  return agregarMetricas(params);
}