/**
 * Dados de demonstração da tela administrativa (valores do protótipo no Figma).
 * Não vêm do backend. TODO: trocar por chamadas à API quando a equipe decidir ligar esta tela aos
 * indicadores reais (o backend já tem o módulo dashboard-indicators; ver docs/api.md).
 */

export interface AplicacaoMonitorada {
  nome: string;
  energiaKwh: number;
  emissaoKgCo2e: number;
}

export const APLICACOES_MONITORADAS: AplicacaoMonitorada[] = [
  { nome: "API principal", energiaKwh: 93.6, emissaoKgCo2e: 4.21 },
  { nome: "Worker de processamento", energiaKwh: 57.2, emissaoKgCo2e: 2.58 },
  { nome: "Site público", energiaKwh: 32.8, emissaoKgCo2e: 1.47 },
];

/** Parcela do consumo estimado por recurso, em %. */
export const CONSUMO_POR_RECURSO = [
  { nome: "CPU", percentual: 62 },
  { nome: "Memória RAM", percentual: 24 },
  { nome: "Disco", percentual: 9 },
  { nome: "Rede", percentual: 5 },
];

/** Formata no padrão brasileiro: 93.6 -> "93,6"; 4.21 -> "4,21". */
export function formatarNumero(valor: number, casas: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
