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