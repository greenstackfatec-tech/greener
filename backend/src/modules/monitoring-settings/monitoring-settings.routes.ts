import type { Rota } from "../../shared/http.ts";
import { buscar } from "./monitoring-settings.controller.ts";

// TODO (TP18 e TP19): proteger esta rota com JWT quando o login existir.
export const rotasMonitoringSettings: Rota[] = [
  { metodo: "GET", caminho: "/monitoring-settings", tratar: buscar },
];