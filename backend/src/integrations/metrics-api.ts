import {
  consultarJson, inteiro, numero, objeto, parametro,
  respostaInvalida, texto, textoOpcional,
} from "./api-client.ts";
import type { OpcoesApi } from "./api-client.ts";

export interface LocalizacaoServico {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
}

export interface Servico {
  id: string;
  name: string;
  location: LocalizacaoServico;
  metrics_path: string;
}

export interface Metricas {
  cpu_percent: number;
  memory_gb: number;
  disk_gb: number;
  network_gb: number;
}

export interface RespostaMetricas {
  /** uint64 do contrato, limitado a Number.MAX_SAFE_INTEGER pelo retorno number. */
  collection_interval_seconds: number;
  metrics: Metricas;
}

const BASE_URL = "https://metrics.unilaunch.org";

function consultar(caminho: string, opcoes: OpcoesApi): Promise<unknown> {
  return consultarJson(BASE_URL, "METRICS_API_URL", caminho, opcoes);
}

function lerServico(dados: unknown): Servico {
  const servico = objeto(dados, "servico");
  const local = objeto(servico.location, "location");
  const location: LocalizacaoServico = {
    region_code: texto(local.region_code, "location.region_code"),
    country: texto(local.country, "location.country"),
    region: texto(local.region, "location.region"),
    city: textoOpcional(local.city, "location.city"),
    latitude: numero(local.latitude, "location.latitude"),
    longitude: numero(local.longitude, "location.longitude"),
  };
  return {
    id: texto(servico.id, "id"),
    name: texto(servico.name, "name"),
    location,
    metrics_path: texto(servico.metrics_path, "metrics_path"),
  };
}

/** Consulta sempre o registro atual, pois os serviços podem entrar e sair. */
export async function listarServicos(opcoes: OpcoesApi = {}): Promise<Servico[]> {
  const dados = await consultar("/services", opcoes);
  if (!Array.isArray(dados)) return respostaInvalida("services (array)");
  return dados.map(lerServico);
}

export async function buscarServico(id: string, opcoes: OpcoesApi = {}): Promise<Servico> {
  const dados = await consultar(`/services/${parametro(id, "id")}`, opcoes);
  return lerServico(dados);
}

/** Mantém as unidades e a precisão da API; falhas não viram métricas zeradas. */
export async function buscarMetricas(id: string, opcoes: OpcoesApi = {}): Promise<RespostaMetricas> {
  const dados = objeto(await consultar(`/metrics/${parametro(id, "id")}`, opcoes), "resposta de metricas");
  const metricas = objeto(dados.metrics, "metrics");
  return {
    collection_interval_seconds: inteiro(dados.collection_interval_seconds, "collection_interval_seconds", 0),
    metrics: {
      cpu_percent: numero(metricas.cpu_percent, "metrics.cpu_percent", 0, 100),
      memory_gb: numero(metricas.memory_gb, "metrics.memory_gb"),
      disk_gb: numero(metricas.disk_gb, "metrics.disk_gb"),
      network_gb: numero(metricas.network_gb, "metrics.network_gb"),
    },
  };
}
