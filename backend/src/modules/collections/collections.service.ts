/**
 * Serviço de orquestração de coletas periódicas.
 * TP06 - Rotina de coleta periódica com intervalo configurável.
 * TP07 - Gravar serviços e coletas no banco.
 * TP09 - Implementar a classe de cálculo e gravar o resultado.
 * TP14 - Tratamento de erros/timeouts APIs externas com diagnóstico.
 * TP15 - Localização opcional (região/cidade nulas).
 */
import {
  buscarAplicacaoId,
  buscarRegiaoId,
  salvarServico,
} from "../services/services.repository.ts";
import type { Servico as ServicoApi, RespostaMetricas } from "../../integrations/metrics-api.ts";
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
import { ErroApi, ErroConfiguracaoApi } from "../../integrations/api-client.ts";
import { buscarIntervaloColetaSegundos } from "../configuracoes/configuracoes.repository.ts";
import { criarRotinaColeta, INTERVALO_PADRAO_SEGUNDOS, intervaloAgendavel } from "./collections.scheduler.ts";
import { criarMonitoramentoColeta } from "./collections.monitoring.ts";
import type { CalculoColeta, ContextoFalha, ResultadoColeta, ResultadoRodadaColeta } from "./collections.types.ts";

export type { ResultadoColeta, ResultadoRodadaColeta } from "./collections.types.ts";

const monitoramento = criarMonitoramentoColeta();
export const consultarMonitoramentoColeta = () => monitoramento.consultar();

function registrarFalha(
  erro: unknown,
  contexto: ContextoFalha,
  tentativa = monitoramento.iniciar(contexto),
) {
  const falha = monitoramento.falhar(tentativa, erro);
  console.error("[COLETA]", { ...falha, erro });
  return falha;
}

function resolverFalha(contexto: ContextoFalha) {
  monitoramento.concluir(monitoramento.iniciar(contexto));
}

async function descobrirServicosMonitorados(): Promise<ServicoApi[]> {
  const tentativa = monitoramento.iniciar({ etapa: "descoberta" });
  try {
    const servicos = await listarServicos();
    monitoramento.descobertaValida(tentativa, servicos.map((servico) => servico.id));
    return servicos;
  } catch (erro) {
    const falha = monitoramento.falhar(tentativa, erro);
    console.error("[COLETA]", { ...falha, erro });
    throw erro;
  }
}

function validarCalculo(calculo: CalculoColeta) {
  for (const valor of [calculo.potenciaEstimadaW, calculo.duracaoSegundos, calculo.energiaKwh, calculo.emissaoCo2eG]) {
    if (!Number.isFinite(valor) || valor < 0) throw new RangeError("Resultado de cálculo inválido");
  }
}

async function coletarEGravarServico(
  servicoApi: ServicoApi,
  aplicacaoId: number,
  intervalo: number,
  contexto: ContextoFalha,
  informarIntervalo?: (segundos: number) => void,
): Promise<ResultadoColeta> {
  const { region, country, region_code: codigoRegiao } = servicoApi.location;
  // TP15: sem país/região grava com regiaoId nulo
  const regiaoId = region && country ? await buscarRegiaoId(region, country) : null;
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
  contexto.servicoId = servico.id;
  contexto.servicoNome = servico.nome;

  let respostaMetricas: RespostaMetricas;
  contexto.etapa = "metricas";
  try {
    respostaMetricas = await buscarMetricas(servicoApi.id);
  } catch (erro) {
    if (!(erro instanceof ErroApi)) throw erro;
    const falha = registrarFalha(erro, contexto);
    contexto.etapa = "persistencia";
    if (erro.statusHttp === 404 || erro.codigoApi === "service_not_found") {
      return { ...identificacaoServico, status: "indisponivel", resultado: "indisponivel", falha, erro: falha.mensagem };
    }
    await gravarColetaIndisponivel(servico.id, intervalo);
    return { ...identificacaoServico, status: "indisponivel", resultado: "indisponivel", falha, erro: falha.mensagem };
  }
  resolverFalha(contexto);

  informarIntervalo?.(respostaMetricas.collection_interval_seconds);
  const intervaloSegundos = respostaMetricas.collection_interval_seconds;
  const metricas = respostaMetricas.metrics;
  const temMetricasValidas = metricas.cpu_percent > 0 || metricas.memory_gb > 0 || metricas.disk_gb > 0 || metricas.network_gb > 0;
  if (!temMetricasValidas) {
    contexto.etapa = "persistencia";
    await gravarColetaRecebida(servico.id, respostaMetricas, null, "sem_metricas");
    return { ...identificacaoServico, status: "sem_metricas", resultado: "sem_metricas", intervaloSegundos };
  }

  // TP15: sem region_code não calcula CO₂e, mas preserva métricas
  let calculo: CalculoColeta;
  contexto.etapa = "calculo";
  if (!codigoRegiao) {
    contexto.etapa = "persistencia";
    await gravarColetaRecebida(servico.id, respostaMetricas);
    const falha = registrarFalha(new Error("Serviço sem localização: CO₂e não calculado"), { ...contexto, etapa: "carbono" });
    return { ...identificacaoServico, status: "sucesso", resultado: "parcial", intervaloSegundos, falha, erro: falha.mensagem };
  }
  try {
    calculo = await calculadoraEnergia.calcularParaServico(respostaMetricas, codigoRegiao);
    validarCalculo(calculo);
    resolverFalha({ ...contexto, etapa: "carbono" });
    resolverFalha(contexto);
  } catch (erro) {
    if (erro instanceof ErroConfiguracaoApi) throw erro;
    const falha = registrarFalha(erro, { ...contexto, etapa: erro instanceof ErroApi ? "carbono" : "calculo" });
    contexto.etapa = "persistencia";
    await gravarColetaRecebida(servico.id, respostaMetricas);
    return { ...identificacaoServico, status: "sucesso", resultado: "parcial", intervaloSegundos, falha, erro: falha.mensagem };
  }
  contexto.etapa = "persistencia";
  await gravarColetaSucesso(servico, respostaMetricas, calculo.intensidadeCarbono, calculo);
  return { ...identificacaoServico, status: "sucesso", resultado: "completo", calculo, intervaloSegundos };
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
    await anterior?.catch(() => {});
    const contexto: ContextoFalha = { etapa: "persistencia", idExterno: servico.id, servicoNome: servico.name };
    monitoramento.iniciarColeta();
    try {
      const id = aplicacaoId ?? await buscarAplicacaoId("GreenER Demo");
      const resultado = await coletarEGravarServico(servico, id, intervalo, contexto, informarIntervalo);
      resolverFalha({ ...contexto, etapa: "persistencia" });
      resolverFalha({ ...contexto, etapa: "configuracao" });
      monitoramento.concluirColeta(servico.id, resultado.resultado === "completo");
      return resultado;
    } catch (erro) {
      registrarFalha(erro, { ...contexto, etapa: erro instanceof ErroConfiguracaoApi ? "configuracao" : contexto.etapa });
      throw erro;
    }
  })().finally(() => {
    if (coletasPendentes.get(servico.id) === coleta) coletasPendentes.delete(servico.id);
  });
  coletasPendentes.set(servico.id, coleta);
  return coleta;
}

export async function buscarIntervaloAlternativo(): Promise<number> {
  const contexto: ContextoFalha = { etapa: "configuracao" };
  const tentativa = monitoramento.iniciar(contexto);
  try {
    const intervalo = await buscarIntervaloColetaSegundos();
    if (intervaloAgendavel(intervalo)) {
      monitoramento.concluir(tentativa);
      return intervalo;
    }
    throw new RangeError("Configuração local de intervalo inválida; usando 60s.");
  } catch (erro) {
    registrarFalha(erro, contexto, tentativa);
  }
  return INTERVALO_PADRAO_SEGUNDOS;
}

export async function executarRodadaColeta(): Promise<ResultadoRodadaColeta> {
  const coletadoEm = new Date();
  const servicosApi = await descobrirServicosMonitorados();
  const rodada: ResultadoRodadaColeta = {
    coletadoEm,
    totalServicos: servicosApi.length,
    sucessos: 0,
    parciais: 0,
    semMetricas: 0,
    indisponiveis: 0,
    erros: 0,
    detalhes: [],
  };
  if (servicosApi.length === 0) return rodada;

  let aplicacaoId: number;
  const persistencia = monitoramento.iniciar({ etapa: "persistencia" });
  try {
    aplicacaoId = await buscarAplicacaoId("GreenER Demo");
    monitoramento.concluir(persistencia);
  } catch (erro) {
    registrarFalha(erro, { etapa: "persistencia" }, persistencia);
    throw erro;
  }
  const intervalo = await buscarIntervaloAlternativo();
  const tarefas = servicosApi.map((servicoApi) => coletarServico(servicoApi, intervalo, undefined, aplicacaoId));
  const resultados = await Promise.allSettled(tarefas);
  for (const coleta of resultados) {
    if (coleta.status === "fulfilled") {
      const resultado = coleta.value;
      rodada.detalhes.push(resultado);
      if (resultado.resultado === "completo") rodada.sucessos++;
      else if (resultado.resultado === "parcial") rodada.parciais++;
      else if (resultado.status === "sem_metricas") rodada.semMetricas++;
      else if (resultado.status === "indisponivel") rodada.indisponiveis++;
      if (resultado.falha) rodada.erros++;
    } else {
      rodada.erros++;
    }
  }
  return rodada;
}

export const rotinaColeta = criarRotinaColeta({
  listarServicos: descobrirServicosMonitorados,
  buscarIntervaloAlternativo,
  coletarServico,
});

export function iniciarRotinaColeta(intervaloSegundos: number): () => void {
  rotinaColeta.iniciar(intervaloSegundos);
  return () => { void rotinaColeta.parar(); };
}

export async function listarColetas(): Promise<Array<{ id: number; servicoId: number; coletadoEm: string; statusColeta: StatusColeta }>> {
  return listarColetasDoRepository();
}

export async function listarColetasDoServico(servicoId: number) {
  return buscarHistoricoColetas(servicoId);
}

export type { StatusColeta };