/**
 * Módulo de coletas - orquestração de coleta periódica de métricas.
 * TP06, TP07, TP09, TP16
 */

export {
  executarRodadaColeta,
  iniciarRotinaColeta,
  type ResultadoColeta,
  type ResultadoRodadaColeta,
  type StatusColeta,
} from "./coletas.service.ts";

export {
  gravarColeta,
  gravarColetaSucesso,
  gravarColetaSemMetricas,
  gravarColetaIndisponivel,
  buscarHistoricoColetas,
  encerrarPool,
  type ColetaParaGravar,
  type StatusColeta as StatusColetaRepository,
} from "./coletas.repository.ts";

export {
  executarColetaManual,
  iniciarRotinaColetaPeriodica,
  pararRotinaColetaPeriodica,
  statusRotinaColeta,
  rotasColetas,
} from "./coletas.controller.ts";