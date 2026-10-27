/**
 * Serviço de orquestração de coletas periódicas.
 * TP06 - Rotina de coleta periódica com intervalo configurável.
 * TP07 - Gravar serviços e coletas no banco.
 * TP09 - Implementar a classe de cálculo e gravar o resultado.
 */

import type { Servico as ServicoBanco } from "../services/services.repository.ts";
import type { Servico as ServicoApi } from "../../integrations/metrics-api.ts";
import type { IntensidadeCarbono } from "../../integrations/carbon-api.ts";
import type { ResultadoCalculo } from "../../calculos/calculo-energia.ts";
import { calculadoraEnergia } from "../../calculos/calculo-energia.ts";
import {
  buscarMetricas,
  listarServicos,
} from "../../integrations/metrics-api.ts";
import { buscarIntensidadeCarbono } from "../../integrations/carbon-api.ts";
import {
  gravarColetaSucesso,
  gravarColetaSemMetricas,
  gravarColetaIndisponivel,
  StatusColeta,
} from "./coletas.repository.ts";
import { ErroApi } from "../../integrations/api-client.ts";
import { buscarIntervaloColetaSegundos } from "../configuracoes/configuracoes.repository.ts";

/** Converte Servico da API externa para formato interno do banco. */
function paraServicoBanco(api: ServicoApi): ServicoBanco {
  return {
    id: Number(api.id),
    nome: api.name,
    status: "ativo",
    cidade: api.location.city,
    latitude: api.location.latitude,
    longitude: api.location.longitude,
  };
}

/** Extrai region_code do serviço (usa location.region_code quando disponível). */
function obterRegionCode(servico: ServicoBanco): string {
  // TODO: Quando o banco tiver location.region_code, usar servico.regionCode
  // Por enquanto, deriva da cidade como fallback
  return servico.cidade ? `BR-${servico.cidade.toUpperCase()}` : "BR-SP";
}

/** Resultado de uma coleta individual. */
export interface ResultadoColeta {
  servicoId: number;
  servicoNome: string;
  status: StatusColeta;
  erro?: string;
  calculo?: ResultadoCalculo & { intensidadeCarbono: IntensidadeCarbono };
}

/** Resultado de uma rodada completa de coleta. */
export interface ResultadoRodadaColeta {
  coletadoEm: Date;
  totalServicos: number;
  sucessos: number;
  semMetricas: number;
  indisponiveis: number;
  erros: number;
  detalhes: ResultadoColeta[];
}

/**
 * Executa uma coleta para um único serviço.
 * @param servico Serviço a ser coletado (formato interno do banco)
 * @returns Resultado da coleta
 */
async function coletarServico(servico: ServicoBanco): Promise<ResultadoColeta> {
  const intervalo = await buscarIntervaloColetaSegundos();
  try {
    // 1. Buscar métricas do serviço (API externa usa string ID)
    const respostaMetricas = await buscarMetricas(String(servico.id));

    // 2. Verificar se há métricas válidas
    const metricas = respostaMetricas.metrics;
    const temMetricasValidas =
      metricas.cpu_percent > 0 ||
      metricas.memory_gb > 0 ||
      metricas.disk_gb > 0 ||
      metricas.network_gb > 0;

    if (!temMetricasValidas) {
      // Serviço ativo mas sem métricas (RF06)
      await gravarColetaSemMetricas(
        servico.id,
        respostaMetricas.collection_interval_seconds,
      );
      return {
        servicoId: servico.id,
        servicoNome: servico.nome,
        status: "sem_metricas",
      };
    }

    // 3. Buscar intensidade de carbono da região do serviço
    const regionCode = obterRegionCode(servico);
    const intensidadeCarbono = await buscarIntensidadeCarbono(regionCode);

    // 4. Calcular potência, energia e CO₂e
    const calculo = await calculadoraEnergia.calcularParaServico(
      respostaMetricas,
      regionCode,
    );

    // 5. Gravar resultado no banco
    await gravarColetaSucesso(
      servico,
      respostaMetricas,
      intensidadeCarbono,
      calculo,
    );

    return {
      servicoId: servico.id,
      servicoNome: servico.nome,
      status: "sucesso",
      calculo,
    };
  } catch (erro) {
    if (erro instanceof ErroApi) {
      if (erro.statusHttp === 404 || erro.codigoApi === "service_not_found") {
        // Serviço removido - não gravar coleta, apenas reportar
        return {
          servicoId: servico.id,
          servicoNome: servico.nome,
          status: "indisponivel",
          erro: "Servico nao encontrado na API",
        };
      }
      if (
        erro.tipo === "timeout" ||
        erro.tipo === "rede" ||
        (erro.tipo === "http" &&
          erro.statusHttp !== undefined &&
          erro.statusHttp >= 500)
      ) {
        // Serviço indisponível (RF05)
        await gravarColetaIndisponivel(servico.id, intervalo);
        return {
          servicoId: servico.id,
          servicoNome: servico.nome,
          status: "indisponivel",
          erro: erro.message,
        };
      }
    }

    // Erro inesperado - tratar como indisponível
    await gravarColetaIndisponivel(servico.id, intervalo);
    return {
      servicoId: servico.id,
      servicoNome: servico.nome,
      status: "indisponivel",
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
    };
  }
}

/**
 * Executa uma rodada completa de coleta para todos os serviços ativos.
 * @returns Resultado consolidado da rodada
 */
export async function executarRodadaColeta(): Promise<ResultadoRodadaColeta> {
  const coletadoEm = new Date();
  const servicosApi = await listarServicos();

  // Converter da API externa para formato interno
  const servicosAtivos = servicosApi.map(paraServicoBanco);

  const resultados = await Promise.all(servicosAtivos.map(coletarServico));

  const sucessos = resultados.filter(
    (r: ResultadoColeta) => r.status === "sucesso",
  ).length;
  const semMetricas = resultados.filter(
    (r: ResultadoColeta) => r.status === "sem_metricas",
  ).length;
  const indisponiveis = resultados.filter(
    (r: ResultadoColeta) => r.status === "indisponivel",
  ).length;
  const erros = resultados.filter(
    (r: ResultadoColeta) => r.erro !== undefined,
  ).length;

  return {
    coletadoEm,
    totalServicos: servicosAtivos.length,
    sucessos,
    semMetricas,
    indisponiveis,
    erros,
    detalhes: resultados,
  };
}

/**
 * Inicia a rotina de coleta periódica.
 * @param intervaloSegundos Intervalo entre coletas em segundos
 * @returns Função para parar a rotina
 */
export function iniciarRotinaColeta(intervaloSegundos: number): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let executando = false;

  async function rodada() {
    if (executando) return; // Evita sobreposição
    executando = true;
    try {
      const resultado = await executarRodadaColeta();
      console.log(
        `[COLETA] ${resultado.coletadoEm.toISOString()} - ` +
          `Total: ${resultado.totalServicos} | ` +
          `Sucesso: ${resultado.sucessos} | ` +
          `Sem métricas: ${resultado.semMetricas} | ` +
          `Indisponíveis: ${resultado.indisponiveis} | ` +
          `Erros: ${resultado.erros}`,
      );
    } catch (erro) {
      console.error("[COLETA] Erro na rodada:", erro);
    } finally {
      executando = false;
    }
  }

  // Executa imediatamente na inicialização
  rodada();

  // Agenda execuções periódicas
  timer = setInterval(rodada, intervaloSegundos * 1000);

  // Retorna função de parada
  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Exporta tipos para uso externo. */
export type { StatusColeta };
