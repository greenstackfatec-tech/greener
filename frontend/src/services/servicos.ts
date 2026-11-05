import { requisitar } from "./api.ts";

export type StatusServico = "ativo" | "indisponivel" | "removido";
export type StatusColeta = "sucesso" | "sem_metricas" | "indisponivel" | null;

/** Serviço como o dashboard o consome (GET /api/services). */
export interface Servico {
  id: number;
  nome: string;
  status: StatusServico;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  regiao: string;
  pais: string;
  coletadoEm: string | null;
  statusColeta: StatusColeta;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

/** Estado visual de um serviço (RF02, RF05, RF06): os três são distintos na interface. */
export type Situacao = "ativo" | "indisponivel" | "sem_metricas" | "removido";

export function situacaoDoServico(servico: Servico): Situacao {
  if (servico.status === "removido") return "removido";
  if (servico.status === "indisponivel" || servico.statusColeta === "indisponivel") return "indisponivel";
  if (servico.statusColeta !== "sucesso") return "sem_metricas";
  return "ativo";
}

export async function listarServicos(signal?: AbortSignal): Promise<Servico[]> {
  const dados = await requisitar<unknown>("/services", signal);
  // Resposta fora do formato esperado conta como falha de atualização (RNF04), não como lista vazia.
  if (!Array.isArray(dados)) throw new Error("Resposta inesperada do servidor.");
  return dados as Servico[];
}
