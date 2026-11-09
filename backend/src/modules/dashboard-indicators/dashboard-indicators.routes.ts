/**
 * Rotas para indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import type { Rota } from "../../shared/http.ts";
import { obterIndicadores } from "./dashboard-indicators.controller.ts";

// A route só liga "método + caminho" ao controller.
export const rotasDashboardIndicators: Rota[] = [
  { metodo: "GET", caminho: "/dashboard/indicadores", tratar: obterIndicadores },
];