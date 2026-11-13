import { buscarIntervaloColetaSegundos } from "../configuracoes/configuracoes.repository.ts";
import { intervaloAgendavel } from "../collections/collections.scheduler.ts";

export interface ConfiguracaoMonitoramento {
  intervaloColetaSegundos: number;
}

export async function buscarConfiguracao(): Promise<ConfiguracaoMonitoramento> {
  const intervaloColetaSegundos = await buscarIntervaloColetaSegundos();
  if (!intervaloAgendavel(intervaloColetaSegundos)) {
    throw new RangeError("Configuração de intervalo de coleta inválida.");
  }
  return { intervaloColetaSegundos };
}

