import type { Servico } from "./services/servicos.ts";

/** Serviço que tem latitude e longitude válidas e, por isso, pode ser desenhado no globo (RF13). */
export interface ServicoNoMapa extends Servico {
  latitude: number;
  longitude: number;
}

/** Serviços que moram no mesmo ponto do globo (ex.: dois serviços em São Paulo). */
export interface GrupoNoMapa {
  chave: string;
  latitude: number;
  longitude: number;
  servicos: ServicoNoMapa[];
}

/** Ponto de vista do globo: a coordenada que fica no centro da tela. */
export interface CentroDoGlobo {
  lat: number;
  lng: number;
}

/** Centro inicial quando não há nenhum serviço no mapa (Brasil, como no protótipo do Figma). */
export const CENTRO_PADRAO: CentroDoGlobo = { lat: -15, lng: -47 };

/** Latitude entre -90 e 90 e longitude entre -180 e 180 (validação do handoff do DD05). */
export function coordenadasValidas(latitude: number | null, longitude: number | null): boolean {
  return (
    latitude !== null && longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
}

function temCoordenadas(servico: Servico): servico is ServicoNoMapa {
  return coordenadasValidas(servico.latitude, servico.longitude);
}

/**
 * Separa quem aparece no mapa de quem fica de fora (RF13). Quem não tem coordenadas
 * continua na lista do dashboard; aqui só é contado para a tela avisar quantos faltam.
 */
export function separarPorCoordenadas(servicos: Servico[]): { noMapa: ServicoNoMapa[]; foraDoMapa: Servico[] } {
  return {
    noMapa: servicos.filter(temCoordenadas),
    foraDoMapa: servicos.filter((servico) => !temCoordenadas(servico)),
  };
}

/** Junta serviços com a mesma coordenada (arredondada em ~100 m) para o pino não ficar escondido atrás de outro. */
export function agruparPorLocal(servicos: ServicoNoMapa[]): GrupoNoMapa[] {
  const grupos = new Map<string, GrupoNoMapa>();
  for (const servico of servicos) {
    const chave = `${servico.latitude.toFixed(3)}|${servico.longitude.toFixed(3)}`;
    const existente = grupos.get(chave);
    if (existente) existente.servicos.push(servico);
    else grupos.set(chave, { chave, latitude: servico.latitude, longitude: servico.longitude, servicos: [servico] });
  }
  return [...grupos.values()];
}

/** Coordenada como a API mandou, no padrão pt-BR e sem arredondar para menos de 6 casas: "-23,5505". */
export function formatarCoordenada(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 6, useGrouping: false });
}

/** "São Paulo · Sudeste · Brazil", só com o que existe; sem nada, "Local não informado". */
export function descricaoDoLocal(servico: Pick<Servico, "cidade" | "regiao" | "pais">): string {
  const partes = [servico.cidade, servico.regiao, servico.pais].filter((parte): parte is string => parte !== null);
  return partes.length > 0 ? partes.join(" · ") : "Local não informado";
}

/**
 * O ponto está na face do globo voltada para quem olha? Usa o ângulo entre o ponto e o centro:
 * acima de 90° ele estaria atrás da esfera. A pequena folga evita pino colado na borda.
 */
export function visivelNoGlobo(latitude: number, longitude: number, centro: CentroDoGlobo): boolean {
  const rad = Math.PI / 180;
  const cosAngulo =
    Math.sin(latitude * rad) * Math.sin(centro.lat * rad) +
    Math.cos(latitude * rad) * Math.cos(centro.lat * rad) * Math.cos((longitude - centro.lng) * rad);
  return cosAngulo > 0.05;
}

/** Centro do conjunto de pontos (média sobre a esfera, não sobre os números); sem pontos, o padrão. */
export function centroDosPontos(pontos: Array<{ latitude: number; longitude: number }>): CentroDoGlobo {
  if (pontos.length === 0) return CENTRO_PADRAO;
  const rad = Math.PI / 180;
  let x = 0, y = 0, z = 0;
  for (const { latitude, longitude } of pontos) {
    x += Math.cos(latitude * rad) * Math.cos(longitude * rad);
    y += Math.cos(latitude * rad) * Math.sin(longitude * rad);
    z += Math.sin(latitude * rad);
  }
  // Pontos em lados opostos do planeta se anulam: nesse caso volta ao padrão.
  if (Math.hypot(x, y, z) < 1e-6 * pontos.length) return CENTRO_PADRAO;
  return { lat: Math.atan2(z, Math.hypot(x, y)) / rad, lng: Math.atan2(y, x) / rad };
}

/** Ponto intermediário da animação (t de 0 a 1), girando pelo caminho mais curto em longitude. */
export function interpolarCentro(de: CentroDoGlobo, para: CentroDoGlobo, t: number): CentroDoGlobo {
  let delta = (para.lng - de.lng) % 360;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return { lat: de.lat + (para.lat - de.lat) * t, lng: de.lng + delta * t };
}

/** Mantém a longitude entre -180 e 180 e a latitude entre -85 e 85 (o polo inverteria o globo). */
export function limitarCentro(centro: CentroDoGlobo): CentroDoGlobo {
  const lng = ((((centro.lng + 180) % 360) + 360) % 360) - 180;
  return { lat: Math.max(-85, Math.min(85, centro.lat)), lng };
}
