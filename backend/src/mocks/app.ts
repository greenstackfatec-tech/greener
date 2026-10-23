import type { IncomingMessage, ServerResponse } from "node:http";
import { metricas, regioes, servicos } from "./fixtures.ts";

export const cenarios: readonly string[] = [
  "normal",
  "servico-fora-do-ar",
  "sem-metricas",
  "sem-localizacao",
];

function responder(response: ServerResponse, status: number, dados: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(dados));
}

// Estes controles só existem no servidor de desenvolvimento.
// Cada URL escolhe seu cenário: não há estado global que afete outros testes.
export function tratarRequisicaoMock(request: IncomingMessage, response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "Accept, Content-Type");
  response.setHeader("cache-control", "no-store");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== "GET") {
    response.setHeader("allow", "GET, OPTIONS");
    responder(response, 405, { error: "method_not_allowed", message: "Use GET." });
    return;
  }

  let partes: string[];
  try {
    partes = new URL(request.url ?? "/", "http://localhost").pathname
      .split("/").slice(1).map(decodeURIComponent);
  } catch {
    responder(response, 400, { error: "invalid_path", message: "Caminho inválido." });
    return;
  }

  let cenario = "normal";
  if (partes[0] === "cenarios") {
    const cenarioSolicitado = partes[1];
    if (!cenarios.includes(cenarioSolicitado)) {
      responder(response, 400, { error: "invalid_scenario", message: "Cenário desconhecido.", cenarios });
      return;
    }
    cenario = cenarioSolicitado;
    partes = partes.slice(2);
  }

  const [recurso, id, acao] = partes;
  if (recurso === "services" && partes.length <= 2) {
    // Convenção local para o teste negativo; location:null não é válido no OpenAPI.
    const dados = servicos.map((servico) => ({
      ...servico,
      location: cenario === "sem-localizacao" ? null : servico.location,
      // O front pode seguir este caminho diretamente a partir da origem do mock.
      metrics_path: cenario === "normal"
        ? servico.metrics_path
        : `/cenarios/${cenario}${servico.metrics_path}`,
    }));
    if (partes.length === 1) {
      responder(response, 200, dados);
      return;
    }
    const servico = dados.find((item) => item.id === id);
    if (servico) {
      responder(response, 200, servico);
      return;
    }
    responder(response, 404, {
      error: "service_not_found",
      message: `service '${id}' is not listed by the aggregator`,
    });
    return;
  }

  if (recurso === "metrics" && partes.length === 2) {
    if (!servicos.some((servico) => servico.id === id)) {
      responder(response, 404, {
        error: "metrics_not_found",
        message: `metrics for service '${id}' are not available`,
      });
      return;
    }
    if (cenario === "servico-fora-do-ar") {
      responder(response, 500, {
        error: "service_unavailable",
        message: `service '${id}' is listed but currently unavailable`,
      });
      return;
    }
    if (cenario === "sem-metricas") {
      // O contrato exige HTTP 500 e error/message como strings, sem fixar seus textos.
      responder(response, 500, {
        error: "metrics_missing",
        message: `metrics for service '${id}' are currently missing`,
      });
      return;
    }
    responder(response, 200, metricas);
    return;
  }

  if (recurso === "regions") {
    if (partes.length === 1) {
      responder(response, 200, { regions: regioes, total: regioes.length });
      return;
    }
    if (partes.length === 2 || (partes.length === 3 && acao === "carbon-intensity")) {
      const regiao = regioes.find((item) => item.code === id);
      if (!regiao) {
        responder(response, 404, {
          error: "region_not_found",
          message: `region '${id}' is not registered`,
        });
        return;
      }
      if (partes.length === 2) {
        responder(response, 200, regiao);
      } else {
        responder(response, 200, {
          region_code: regiao.code,
          country: regiao.country,
          region: regiao.region,
          city: regiao.city,
          carbon_intensity_gco2e_per_kwh: regiao.carbon_intensity_gco2e_per_kwh,
          renewable_share_percent: regiao.renewable_share_percent,
        });
      }
      return;
    }
  }

  responder(response, 404, { error: "not_found", message: "Route not found" });
}
