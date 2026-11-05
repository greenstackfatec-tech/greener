/**
 * Controller para indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { responder } from "../../shared/http.ts";
import { obterIndicadoresDashboard } from "./dashboard-indicators.service.ts";

/**
 * GET /dashboard/indicadores
 * Retorna os indicadores consolidados do ambiente.
 */
export async function obterIndicadores(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    const indicadores = await obterIndicadoresDashboard();
    responder(response, 200, indicadores);
  } catch (erro) {
    console.error("[DASHBOARD-INDICATORS-CONTROLLER] Erro ao obter indicadores:", erro);
    responder(response, 500, { error: "internal_error" });
  }
}