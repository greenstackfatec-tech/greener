import type { Rota } from "../../shared/http.ts";
import { historico, ranking, comparacao } from "./analytics.controller.ts";

export const rotasAnalytics: Rota[] = [
  { metodo: "GET", caminho: "/analytics/historico/:servicoId", tratar: historico },
  { metodo: "GET", caminho: "/analytics/ranking", tratar: ranking },
  { metodo: "GET", caminho: "/analytics/comparacao", tratar: comparacao },
];