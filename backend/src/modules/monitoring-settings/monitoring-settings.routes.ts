import type { Rota } from "../../shared/http.ts";
import { buscar } from "./monitoring-settings.controller.ts";
import { exigirAutenticacao } from "../auth/auth.middleware.ts";

export const rotasMonitoringSettings: Rota[] = [
  { metodo: "GET", caminho: "/monitoring-settings", tratar: exigirAutenticacao(buscar) },
];
