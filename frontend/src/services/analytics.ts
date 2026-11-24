import { requisitar } from "./api.ts";

/** Parâmetros para buscar o histórico de um serviço. */
export interface HistoricoParams {
  servicoId: number;
  inicio: string; // ISO 8601
  fim: string;    // ISO 8601
  apenasSucesso?: boolean;
  limite?: number;
  offset?: number;
  ordenacao?: "ASC" | "DESC";
}

/** Ponto do histórico devolvido pelo backend (GET /analytics/historico/:servicoId). */
export interface PontoHistorico {
  coletadoEm: string;           // ISO 8601
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  intervaloSegundos: number | null;
  statusColeta: "sucesso" | "sem_metricas" | "indisponivel";
  potenciaEstimadaW: number | null;
  duracaoSegundos: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

/** Resposta completa do endpoint de histórico. */
export interface HistoricoResposta {
  dados: PontoHistorico[];
  periodo: {
    inicio: string;
    fim: string;
  };
}

/** GET /api/analytics/historico/:servicoId. Exige autenticação. */
export async function consultarHistorico(
  servicoId: number,
  params: Omit<HistoricoParams, "servicoId">,
  signal?: AbortSignal
): Promise<HistoricoResposta> {
  const query = new URLSearchParams();
  if (params.inicio) query.set("inicio", params.inicio);
  if (params.fim) query.set("fim", params.fim);
  if (params.apenasSucesso !== undefined) query.set("apenasSucesso", String(params.apenasSucesso));
  if (params.limite !== undefined) query.set("limite", String(params.limite));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.ordenacao) query.set("ordenacao", params.ordenacao);

  const caminho = `/analytics/historico/${servicoId}${query.toString() ? `?${query.toString()}` : ""}`;
  return requisitar<HistoricoResposta>(caminho, signal);
}

export interface RankingParams {
  inicio: string;
  fim: string;
  metrica: "energia" | "co2e";
  agregacao: "total" | "media";
  ordenacao: "ASC" | "DESC";
  aplicacaoId?: number;
  limite: number;
  offset: number;
}

export interface RankingItem {
  servicoId: number;
  nome: string;
  aplicacao: string;
  totalEnergiaKwh: number | null;
  totalEmissaoCo2eG: number | null;
  mediaEnergiaKwh: number | null;
  mediaEmissaoCo2eG: number | null;
  tendenciaPercentual: number | null;
}

export interface RankingResposta extends Pick<RankingParams, "metrica" | "agregacao" | "ordenacao"> {
  periodo: { inicio: string; fim: string };
  dados: RankingItem[];
  aplicacoes: { id: number; nome: string }[];
  resumo: {
    classificados: number;
    semDados: number;
    mediaEnergiaKwh: number | null;
    mediaEmissaoCo2eG: number | null;
    menorEnergia: { nome: string; mediaEnergiaKwh: number } | null;
    primeiroColocado: RankingItem | null;
  };
}

export async function consultarRanking(params: RankingParams, signal?: AbortSignal): Promise<RankingResposta> {
  const query = new URLSearchParams({
    inicio: params.inicio,
    fim: params.fim,
    metrica: params.metrica,
    agregacao: params.agregacao,
    ordenacao: params.ordenacao,
    limite: String(params.limite),
    offset: String(params.offset),
  });
  if (params.aplicacaoId !== undefined) query.set("aplicacaoId", String(params.aplicacaoId));
  const resposta = await requisitar<RankingResposta>(`/analytics/ranking?${query}`, signal);
  if (!Array.isArray(resposta?.dados) || !Array.isArray(resposta.aplicacoes) || !resposta.periodo || !resposta.resumo) {
    throw new Error("Resposta do ranking incompleta.");
  }
  return resposta;
}
