import type { Rota } from "../../shared/http.ts";
import {
  listar,
  executarColetaManual,
  iniciarRotinaColetaPeriodica,
  pararRotinaColetaPeriodica,
  statusRotinaColeta,
} from "./collections.controller.ts";

export const rotasCollections: Rota[] = [
  { metodo: "GET", caminho: "/collections", tratar: listar },
  { metodo: "POST", caminho: "/collections/executar", tratar: executarColetaManual },
  { metodo: "POST", caminho: "/collections/rotina/iniciar", tratar: iniciarRotinaColetaPeriodica },
  { metodo: "POST", caminho: "/collections/rotina/parar", tratar: pararRotinaColetaPeriodica },
  { metodo: "GET", caminho: "/collections/rotina/status", tratar: statusRotinaColeta },
];