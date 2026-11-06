import { requisitar } from "./api.ts";

export type StatusServico = "ativo" | "indisponivel" | "removido";
export type StatusColeta = "sucesso" | "sem_metricas" | "indisponivel";

/** Serviço como o dashboard o consome (GET /api/services). */
export interface Servico {
  id: number;
  nome: string;
  status: StatusServico;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Vêm da região; nulos quando o serviço não tem localização (a tela mostra "Não informado", RF12). */
  regiao: string | null;
  pais: string | null;
  coletadoEm: string | null;
  statusColeta: StatusColeta | null;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

const STATUS_SERVICO: readonly string[] = ["ativo", "indisponivel", "removido"];
const STATUS_COLETA: readonly string[] = ["sucesso", "sem_metricas", "indisponivel"];

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function normalizar(item: unknown): Servico {
  const bruto = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
  const id = numero(bruto.id);
  const nome = texto(bruto.nome);
  const status = typeof bruto.status === "string" && STATUS_SERVICO.includes(bruto.status) ? bruto.status : null;
  if (id === null || nome === null || status === null) {
    throw new Error("Resposta de serviços inválida: item sem id, nome ou status.");
  }
  const statusColeta =
    typeof bruto.statusColeta === "string" && STATUS_COLETA.includes(bruto.statusColeta) ? bruto.statusColeta : null;

  return {
    id,
    nome,
    status: status as StatusServico,
    cidade: texto(bruto.cidade),
    latitude: numero(bruto.latitude),
    longitude: numero(bruto.longitude),
    regiao: texto(bruto.regiao),
    pais: texto(bruto.pais),
    coletadoEm: texto(bruto.coletadoEm),
    statusColeta: statusColeta as StatusColeta | null,
    cpuPercentual: numero(bruto.cpuPercentual),
    memoriaGb: numero(bruto.memoriaGb),
    discoGb: numero(bruto.discoGb),
    redeGb: numero(bruto.redeGb),
    energiaKwh: numero(bruto.energiaKwh),
    emissaoCo2eG: numero(bruto.emissaoCo2eG),
  };
}

/** GET /api/services. Rota pública. */
export async function listarServicos(signal?: AbortSignal): Promise<Servico[]> {
  const bruto = await requisitar<unknown>("/services", signal);
  if (!Array.isArray(bruto)) {
    throw new Error("Resposta de serviços inválida: esperado um array.");
  }
  return bruto.map(normalizar);
}
/** Estado visual de um serviço (RF02, RF05, RF06): os três são distintos na interface. */
export type Situacao = "ativo" | "indisponivel" | "sem_metricas" | "removido";

export function situacaoDoServico(servico: Servico): Situacao {
  if (servico.status === "removido") return "removido";
  if (servico.status === "indisponivel" || servico.statusColeta === "indisponivel") return "indisponivel";
  if (servico.statusColeta !== "sucesso") return "sem_metricas";
  return "ativo";
}

