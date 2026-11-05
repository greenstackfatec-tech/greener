export interface ConfiguracaoMonitoramento {
  intervaloColetaSegundos: number;
}

// Mesmo valor padrão de 'intervalo_coleta_segundos' no database/seed.sql.
// Quando o banco entrar, só o corpo de buscarConfiguracao() muda.
export async function buscarConfiguracao(): Promise<ConfiguracaoMonitoramento> {
  return { intervaloColetaSegundos: 60 };
}