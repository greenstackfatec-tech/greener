import type { Rota } from "../../shared/http.ts";
import { exigirAutenticacao } from "../auth/auth.middleware.ts";
import { historico, ranking, comparacao } from "./analytics.controller.ts";

export const rotasAnalytics: Rota[] = [
  { metodo: "GET", caminho: "/analytics/historico/:servicoId", tratar: exigirAutenticacao(historico) },
  { metodo: "GET", caminho: "/analytics/ranking", tratar: exigirAutenticacao(ranking) },
  { metodo: "GET", caminho: "/analytics/comparacao", tratar: exigirAutenticacao(comparacao) },
];
