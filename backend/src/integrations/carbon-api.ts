import {
  consultarJson, inteiro, numero, objeto, parametro,
  respostaInvalida, texto, textoOpcional,
} from "./api-client.ts";
import type { OpcoesApi } from "./api-client.ts";

export interface IntensidadeCarbono {
  region_code: string;
  country: string;
  region: string;
  city: string | null;
  carbon_intensity_gco2e_per_kwh: number;
  renewable_share_percent: number;
}

export interface RegiaoCarbono {
  code: string;
  country: string;
  region: string;
  city: string | null;
  latitude: number;
  longitude: number;
  carbon_intensity_gco2e_per_kwh: number;
  renewable_share_percent: number;
}

export interface RespostaRegioes {
  regions: RegiaoCarbono[];
  total: number;
}

const BASE_URL = "https://carbon.unilaunch.org";

function consultar(caminho: string, opcoes: OpcoesApi): Promise<unknown> {
  return consultarJson(BASE_URL, "CARBON_API_URL", caminho, opcoes);
}

function lerRegiao(dados: unknown): RegiaoCarbono {
  const regiao = objeto(dados, "regiao");
  return {
    code: texto(regiao.code, "code"),
    country: texto(regiao.country, "country"),
    region: texto(regiao.region, "region"),
    city: textoOpcional(regiao.city, "city"),
    latitude: numero(regiao.latitude, "latitude"),
    longitude: numero(regiao.longitude, "longitude"),
    carbon_intensity_gco2e_per_kwh: numero(regiao.carbon_intensity_gco2e_per_kwh, "carbon_intensity_gco2e_per_kwh"),
    renewable_share_percent: numero(regiao.renewable_share_percent, "renewable_share_percent"),
  };
}

export async function listarRegioes(opcoes: OpcoesApi = {}): Promise<RespostaRegioes> {
  const dados = objeto(await consultar("/regions", opcoes), "resposta de regioes");
  if (!Array.isArray(dados.regions)) return respostaInvalida("regions (array)");
  return { regions: dados.regions.map(lerRegiao), total: inteiro(dados.total, "total") };
}

export async function buscarRegiao(codigo: string, opcoes: OpcoesApi = {}): Promise<RegiaoCarbono> {
  return lerRegiao(await consultar(`/regions/${parametro(codigo, "codigo")}`, opcoes));
}

/** Use o location.region_code retornado pelo agregador de métricas. */
export async function buscarIntensidadeCarbono(
  codigo: string,
  opcoes: OpcoesApi = {},
): Promise<IntensidadeCarbono> {
  const dados = objeto(
    await consultar(`/regions/${parametro(codigo, "codigo")}/carbon-intensity`, opcoes),
    "intensidade de carbono",
  );
  return {
    region_code: texto(dados.region_code, "region_code"),
    country: texto(dados.country, "country"),
    region: texto(dados.region, "region"),
    city: textoOpcional(dados.city, "city"),
    carbon_intensity_gco2e_per_kwh: numero(dados.carbon_intensity_gco2e_per_kwh, "carbon_intensity_gco2e_per_kwh"),
    renewable_share_percent: numero(dados.renewable_share_percent, "renewable_share_percent"),
  };
}
