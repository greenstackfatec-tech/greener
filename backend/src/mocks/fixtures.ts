import type { RespostaMetricas, Servico } from "../integrations/metrics-api.ts";
import type { RegiaoCarbono } from "../integrations/carbon-api.ts";

export const regioes: RegiaoCarbono[] = [
  {
    code: "BR-SP",
    country: "Brazil",
    region: "Sao Paulo",
    city: "Sao Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    carbon_intensity_gco2e_per_kwh: 100,
    renewable_share_percent: 80,
  },
  {
    code: "DE-BE",
    country: "Germany",
    region: "Berlin",
    city: null,
    latitude: 52.52,
    longitude: 13.405,
    carbon_intensity_gco2e_per_kwh: 350,
    renewable_share_percent: 50,
  },
];

export const servicos: Servico[] = regioes.map((regiao, indice) => ({
  id: `servico-${indice + 1}`,
  name: indice === 0 ? "Loja de demonstração" : "Catálogo de demonstração",
  location: {
    region_code: regiao.code,
    country: regiao.country,
    region: regiao.region,
    city: regiao.city,
    latitude: regiao.latitude,
    longitude: regiao.longitude,
  },
  metrics_path: `/metrics/servico-${indice + 1}`,
}));

export const metricas: RespostaMetricas = {
  collection_interval_seconds: 60,
  metrics: {
    cpu_percent: 25,
    memory_gb: 2,
    disk_gb: 10,
    network_gb: 0.15,
  },
};
