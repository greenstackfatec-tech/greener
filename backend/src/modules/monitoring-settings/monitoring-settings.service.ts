import { buscarConfiguracao as buscarConfiguracaoDoRepository } from "./monitoring-settings.repository.ts";
import type { ConfiguracaoMonitoramento } from "./monitoring-settings.repository.ts";

export async function buscarConfiguracao(): Promise<ConfiguracaoMonitoramento> {
  return buscarConfiguracaoDoRepository();
}