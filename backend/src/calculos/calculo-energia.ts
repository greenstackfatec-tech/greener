/**
 * Cálculo de potência, energia e emissão de CO₂e por coleta.
 * Baseado no modelo oficial do cliente GreenER.
 */

import type { IntensidadeCarbono } from "../integrations/carbon-api.ts";
import type {
  Metricas,
  RespostaMetricas,
} from "../integrations/metrics-api.ts";

/** Fatores de potência oficiais (constantes de configuração). */
export const FATORES_POTENCIA = {
  /** Potência base do CPU a 100% de utilização (W). */
  CPU_W: 100,
  /** Potência por GB de RAM (W/GB). */
  RAM_W_POR_GB: 0.375,
  /** Potência por GB de disco (W/GB). */
  DISCO_W_POR_GB: 0.01,
  /** Potência por GB de rede (W/GB). */
  REDE_W_POR_GB: 0.02,
} as const;

/** Resultado do cálculo de uma coleta. */
export interface ResultadoCalculo {
  potenciaEstimadaW: number;
  duracaoSegundos: number;
  energiaKwh: number;
  emissaoCo2eG: number;
}

/** Arredonda para 8 casas decimais (precisão do schema do banco). */
function arredondar8(valor: number): number {
  return Number(valor.toFixed(8));
}

/**
 * Calcula a potência estimada em Watts baseada nas métricas coletadas.
 * @param metricas Métricas brutas da API (CPU %, RAM GB, Disco GB, Rede GB)
 * @returns Potência estimada em Watts
 */
export function calcularPotencia(metricas: Metricas): number {
  if (
    metricas.cpu_percent < 0 ||
    metricas.memory_gb < 0 ||
    metricas.disk_gb < 0 ||
    metricas.network_gb < 0
  ) {
    throw new Error("Métricas não podem ser negativas");
  }
  const cpuW = (metricas.cpu_percent / 100) * FATORES_POTENCIA.CPU_W;
  const ramW = metricas.memory_gb * FATORES_POTENCIA.RAM_W_POR_GB;
  const discoW = metricas.disk_gb * FATORES_POTENCIA.DISCO_W_POR_GB;
  const redeW = metricas.network_gb * FATORES_POTENCIA.REDE_W_POR_GB;
  return arredondar8(cpuW + ramW + discoW + redeW);
}

/**
 * Calcula a energia consumida em kWh.
 * @param potenciaW Potência em Watts
 * @param duracaoSegundos Duração da coleta em segundos
 * @returns Energia em kWh
 */
export function calcularEnergia(
  potenciaW: number,
  duracaoSegundos: number,
): number {
  if (potenciaW < 0 || duracaoSegundos < 0) {
    throw new Error("Potência e duração não podem ser negativas");
  }
  const duracaoHoras = duracaoSegundos / 3600;
  return arredondar8((potenciaW * duracaoHoras) / 1000);
}

/**
 * Calcula a emissão de CO₂e em gramas.
 * @param energiaKwh Energia consumida em kWh
 * @param intensidadeCarbono Intensidade de carbono da região (gCO₂e/kWh)
 * @returns Emissão em gramas de CO₂e
 */
export function calcularEmissaoCo2e(
  energiaKwh: number,
  intensidadeCarbono: number,
): number {
  if (energiaKwh < 0 || intensidadeCarbono < 0) {
    throw new Error("Energia e intensidade de carbono não podem ser negativas");
  }
  return arredondar8(energiaKwh * intensidadeCarbono);
}

/**
 * Executa o cálculo completo de uma coleta: potência, energia e CO₂e.
 * @param respostaMetricas Resposta da API de métricas (inclui intervalo e métricas)
 * @param intensidadeCarbono Intensidade de carbono da região do serviço
 * @returns Objeto com todos os resultados do cálculo
 */
export function calcularColeta(
  respostaMetricas: RespostaMetricas,
  intensidadeCarbono: IntensidadeCarbono,
): ResultadoCalculo {
  const potenciaEstimadaW = calcularPotencia(respostaMetricas.metrics);
  const duracaoSegundos = respostaMetricas.collection_interval_seconds;
  const energiaKwh = calcularEnergia(potenciaEstimadaW, duracaoSegundos);
  const emissaoCo2eG = calcularEmissaoCo2e(
    energiaKwh,
    intensidadeCarbono.carbon_intensity_gco2e_per_kwh,
  );

  return {
    potenciaEstimadaW,
    duracaoSegundos,
    energiaKwh,
    emissaoCo2eG,
  };
}

/**
 * Função para buscar intensidade de carbono (injeta dependência para testabilidade).
 */
export type BuscarIntensidadeCarbono = (
  regionCode: string,
) => Promise<IntensidadeCarbono>;

/**
 * Classe principal para orquestrar o cálculo de energia e emissões.
 * Encapsula as dependências (API de carbono) e expõe interface limpa.
 */
export class CalculadoraEnergia {
  private readonly buscarIntensidade: BuscarIntensidadeCarbono;

  /**
   * @param buscarIntensidade Função para buscar intensidade de carbono (permite mock em testes)
   */
  constructor(buscarIntensidade?: BuscarIntensidadeCarbono) {
    this.buscarIntensidade =
      buscarIntensidade ??
      ((regionCode) =>
        import("../integrations/carbon-api.ts").then(
          ({ buscarIntensidadeCarbono }) =>
            buscarIntensidadeCarbono(regionCode),
        ));
  }

  /**
   * Calcula e retorna o resultado completo para uma coleta de um serviço.
   * @param respostaMetricas Dados da API de métricas do serviço
   * @param regionCode Código da região (location.region_code do serviço)
   * @returns Resultado do cálculo com potência, energia e CO₂e
   */
  async calcularParaServico(
    respostaMetricas: RespostaMetricas,
    regionCode: string,
  ): Promise<ResultadoCalculo & { intensidadeCarbono: IntensidadeCarbono }> {
    const intensidadeCarbono = await this.buscarIntensidade(regionCode);
    const resultado = calcularColeta(respostaMetricas, intensidadeCarbono);
    return { ...resultado, intensidadeCarbono };
  }
}

/** Instância singleton para uso na aplicação (usa API real). */
export const calculadoraEnergia = new CalculadoraEnergia();
