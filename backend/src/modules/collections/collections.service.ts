/**
 * Serviço de orquestração de coletas periódicas.
 * TP06 - Rotina de coleta periódica com intervalo configurável.
 * TP07 - Gravar serviços e coletas no banco.
 * TP09 - Implementar a classe de cálculo e gravar o resultado.
 */
import {
  buscarAplicacaoId,
  buscarRegiaoId,
  salvarServico,
} from "../services/services.repository.ts";
import type { Servico as ServicoApi, RespostaMetricas } from "../../integrations/metrics-api.ts";
import type { IntensidadeCarbono } from "../../integrations/carbon-api.ts";
import type { ResultadoCalculo } from "../../calculos/calculo-energia.ts";
import { calculadoraEnergia } from "../../calculos/calculo-energia.ts";
import { buscarMetricas, listarServicos } from "../../integrations/metrics-api.ts";
import {
  gravarColetaSucesso,
  gravarColetaRecebida,
  gravarColetaIndisponivel,
  type StatusColeta,
  buscarHistoricoColetas,
  listarColetas as listarColetasDoRepository,
} from "./collections.repository.ts";
import { ErroApi } from "../../integrations/api-client.ts";
import { buscarIntervaloColetaSegundos } from "../configuracoes/configuracoes.repository.ts";
import { criarRotinaColeta, INTERVALO_PADRAO_SEGUNDOS, intervaloAgendavel } from "./collections.scheduler.ts";

interface CalculoColeta extends ResultadoCalculo {
  intensidadeCarbono: IntensidadeCarbono;
}

/** Resultado de uma coleta individual. */
export interface ResultadoColeta {
  servicoId: number;
  servicoNome: string;
  status: StatusColeta;
  erro?: string;
  calculo?: CalculoColeta;
  intervaloSegundos?: number;
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

async function coletarEGravarServico(
  servicoApi: ServicoApi,
  aplicacaoId: number,
  intervalo: number,
  informarIntervalo?: (segundos: number) => void,
): Promise<ResultadoColeta> {
  const regiaoId = await buscarRegiaoId(servicoApi.location.region, servicoApi.location.country);
  const servico = await salvarServico({
    idExterno: servicoApi.id,
    nome: servicoApi.name,
    aplicacaoId,
    regiaoId,
    cidade: servicoApi.location.city,
    latitude: servicoApi.location.latitude,
    longitude: servicoApi.location.longitude,
  });
  const identificacaoServico = { servicoId: servico.id, servicoNome: servico.nome };

  let respostaMetricas: RespostaMetricas;
  try {
    respostaMetricas = await buscarMetricas(servicoApi.id);
  } catch (erro) {
    // HTTP 404 é reportado sem inserir uma coleta.
    if (
      erro instanceof ErroApi &&
      (erro.statusHttp === 404 || erro.codigoApi === "service_not_found")
    ) {
      return {
        ...identificacaoServico,
        status: "indisponivel",
        erro: "Servico nao encontrado na API",
      };
    }
    await gravarColetaIndisponivel(servico.id, intervalo);
    return {
      ...identificacaoServico,
      status: "indisponivel",
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
    };
  }

  informarIntervalo?.(respostaMetricas.collection_interval_seconds);
  const intervaloSegundos = respostaMetricas.collection_interval_seconds;
  const metricas = respostaMetricas.metrics;
  const temMetricasValidas =
    metricas.cpu_percent > 0 ||
    metricas.memory_gb > 0 ||
    metricas.disk_gb > 0 ||
    metricas.network_gb > 0;
  if (!temMetricasValidas) {
    await gravarColetaRecebida(servico.id, respostaMetricas, null, "sem_metricas");
    return { ...identificacaoServico, status: "sem_metricas", intervaloSegundos };
  }

  // Falhas no cálculo não descartam as métricas recebidas.
  let calculo: CalculoColeta | undefined;
  let erroCalculo: string | undefined;
  try {
    calculo = await calculadoraEnergia.calcularParaServico(
      respostaMetricas,
      servicoApi.location.region_code,
    );
  } catch (erro) {
    erroCalculo = erro instanceof Error ? erro.message : "Falha ao calcular a coleta";
  }
  if (calculo) {
    await gravarColetaSucesso(servico, respostaMetricas, calculo.intensidadeCarbono, calculo);
  } else {
    await gravarColetaRecebida(servico.id, respostaMetricas);
  }
  return { ...identificacaoServico, status: "sucesso", calculo, erro: erroCalculo, intervaloSegundos };
}

const coletasPendentes = new Map<string, Promise<ResultadoColeta>>();

export function coletarServico(
  servico: ServicoApi,
  intervalo: number,
  informarIntervalo?: (segundos: number) => void,
  aplicacaoId?: number,
): Promise<ResultadoColeta> {
  const anterior = coletasPendentes.get(servico.id);
  const coleta = (async () => {
    await anterior?.catch(() => {}); // Uma falha anterior não bloqueia a fila.
    const id = aplicacaoId ?? await buscarAplicacaoId("GreenER Demo");
    return coletarEGravarServico(servico, id, intervalo, informarIntervalo);
  })().finally(() => {
    if (coletasPendentes.get(servico.id) === coleta) coletasPendentes.delete(servico.id);
  });
  coletasPendentes.set(servico.id, coleta);
  return coleta;
}

export async function buscarIntervaloAlternativo(): Promise<number> {
  try {
    const intervalo = await buscarIntervaloColetaSegundos();
    if (intervaloAgendavel(intervalo)) return intervalo;
    console.warn("[COLETA] Configuração local de intervalo inválida; usando 60s.");
  } catch (erro) {
    console.error("[COLETA] Falha ao ler intervalo local; usando 60s:", erro);
  }
  return INTERVALO_PADRAO_SEGUNDOS;
}

export async function executarRodadaColeta(): Promise<ResultadoRodadaColeta> {
  const coletadoEm = new Date();
  const servicosApi = await listarServicos();
  const rodada: ResultadoRodadaColeta = {
    coletadoEm,
    totalServicos: servicosApi.length,
    sucessos: 0,
    semMetricas: 0,
    indisponiveis: 0,
    erros: 0,
    detalhes: [],
  };

  if (servicosApi.length === 0) {
    return rodada;
  }

  const aplicacaoId = await buscarAplicacaoId("GreenER Demo");
  const intervalo = await buscarIntervaloAlternativo();
  const tarefas = servicosApi.map((servicoApi) =>
    coletarServico(servicoApi, intervalo, undefined, aplicacaoId),
  );

  // Espera todas as gravações terminarem antes de reportar uma falha.
  const coletas = await Promise.allSettled(tarefas);
  const falhas: unknown[] = [];

  for (const coleta of coletas) {
    if (coleta.status === "rejected") {
      falhas.push(coleta.reason);
      continue;
    }

    const resultado = coleta.value;
    rodada.detalhes.push(resultado);

    if (resultado.status === "sucesso") {
      rodada.sucessos++;
    } else if (resultado.status === "sem_metricas") {
      rodada.semMetricas++;
    } else if (resultado.status === "indisponivel") {
      rodada.indisponiveis++;
    }

    if (resultado.erro !== undefined) {
      rodada.erros++;
    }
  }

  if (falhas.length > 0) {
    throw new AggregateError(falhas, "Falha ao persistir a rodada de coleta");
  }

  return rodada;
}

export const rotinaColeta = criarRotinaColeta({
  listarServicos, buscarIntervaloAlternativo, coletarServico,
});

export function iniciarRotinaColeta(intervaloSegundos: number): () => void {
  rotinaColeta.iniciar(intervaloSegundos);
  return () => { void rotinaColeta.parar(); };
}

/**
 * Lista o histórico de coletas de todos os serviços.
 * @returns Lista de coletas
 */
export async function listarColetas(): Promise<
  Array<{
    id: number;
    servicoId: number;
    coletadoEm: string;
    statusColeta: StatusColeta;
  }>
> {
  return listarColetasDoRepository();
}

/** Lista o histórico de coletas de um serviço, com as métricas e o cálculo. */
export async function listarColetasDoServico(servicoId: number) {
  return buscarHistoricoColetas(servicoId);
}

/** Exporta tipos para uso externo. */
export type { StatusColeta };
