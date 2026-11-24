import type { Rota } from "../../shared/http.ts";
import { exigirAutenticacao } from "../auth/auth.middleware.ts";
import {
  listar,
  executarColetaManual,
  iniciarRotinaColetaPeriodica,
  pararRotinaColetaPeriodica,
  statusRotinaColeta,
} from "./collections.controller.ts";

export const rotasCollections: Rota[] = [
  { metodo: "GET", caminho: "/collections", tratar: exigirAutenticacao(listar) },
  { metodo: "POST", caminho: "/collections/executar", tratar: exigirAutenticacao(executarColetaManual) },
  { metodo: "POST", caminho: "/collections/rotina/iniciar", tratar: exigirAutenticacao(iniciarRotinaColetaPeriodica) },
  { metodo: "POST", caminho: "/collections/rotina/parar", tratar: exigirAutenticacao(pararRotinaColetaPeriodica) },
  { metodo: "GET", caminho: "/collections/rotina/status", tratar: exigirAutenticacao(statusRotinaColeta) },
];
