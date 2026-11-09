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
  sincronizarPresencaServicos,
  type Servico,
} from "../services/services.repository.ts";
import type { Servico as ServicoApi, RespostaMetricas } from "../../integrations/metrics-api.ts";
import { calculadoraEnergia } from "../../calculos/calculo-energia.ts";
import { buscarMetricas, listarServicos } from "../../integrations/metrics-api.ts";
import {
  gravarColetaSucesso,
  gravarColetaRecebida,
  gravarColetaSemMetricas,
  gravarColetaIndisponivel,
  type StatusColeta,
  buscarHistoricoColetas,
  listarColetas as listarColetasDoRepository,
} from "./collections.repository.ts";
import { ErroApi, ErroConfiguracaoApi, respostaInvalida } from "../../integrations/api-client.ts";
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

interface PresencaServico { presente: boolean }
const presencas = new Map<string, Map<string, PresencaServico>>();
const cadastrosDescobertos = new WeakMap<ServicoApi, {
  presenca: PresencaServico;
  cadastro: PromiseSettledResult<Servico>;
}>();
const descobertas = new Map<string, Promise<ServicoApi[]>>();
class ColetaCancelada extends Error {}

async function salvarCadastroServico(servicoApi: ServicoApi, aplicacaoId: number, registrarInclusao = false) {
  const { region, country } = servicoApi.location;
  const regiaoId = region && country ? await buscarRegiaoId(region, country) : null;
  return salvarServico({
    idExterno: servicoApi.id, nome: servicoApi.name, aplicacaoId, regiaoId,
    cidade: servicoApi.location.city, latitude: servicoApi.location.latitude,
    longitude: servicoApi.location.longitude,
  }, registrarInclusao);
}

function descobrirServicosMonitorados(): Promise<ServicoApi[]> {
  const origem = process.env.METRICS_API_URL ?? "padrao";
  const pendente = descobertas.get(origem);
  if (pendente) return pendente;
  const descoberta = sincronizarCatalogo(origem).finally(() => {
    if (descobertas.get(origem) === descoberta) descobertas.delete(origem);
  });
  descobertas.set(origem, descoberta);
  return descoberta;
}

async function sincronizarCatalogo(origem: string): Promise<ServicoApi[]> {
  const tentativa = monitoramento.iniciar({ etapa: "descoberta" });
  try {
    const servicos = await listarServicos();
    const ids = servicos.map((servico) => servico.id);
    if (ids.some((id) => !id.trim() || [...id].length > 100) || new Set(ids).size !== ids.length) {
      return respostaInvalida("identificadores dos serviços");
    }
    const aplicacaoId = await buscarAplicacaoId("GreenER Demo");
    const persistencia = monitoramento.iniciar({ etapa: "persistencia" });
    try {
      await sincronizarPresencaServicos(aplicacaoId, ids);
      monitoramento.concluir(persistencia);
    } catch (erro) {
      registrarFalha(erro, { etapa: "persistencia" }, persistencia);
      throw erro;
    }
    const catalogo = presencas.get(origem) ?? new Map<string, PresencaServico>();
    presencas.set(origem, catalogo);
    const presentes = new Set(ids);
    for (const [id, presenca] of catalogo) {
      if (!presentes.has(id)) { presenca.presente = false; catalogo.delete(id); }
    }
    const cadastros = await Promise.allSettled(servicos.map((servico) =>
      salvarCadastroServico(servico, aplicacaoId, true),
    ));
    servicos.forEach((servico, indice) => {
      const presenca = catalogo.get(servico.id) ?? { presente: true };
      catalogo.set(servico.id, presenca);
      cadastrosDescobertos.set(servico, { presenca, cadastro: cadastros[indice] });
    });
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
  const { region_code: codigoRegiao } = servicoApi.location;
  const cadastro = cadastrosDescobertos.get(servicoApi)?.cadastro;
  if (cadastro?.status === "rejected") throw cadastro.reason;
  const servico = cadastro?.value ?? await salvarCadastroServico(servicoApi, aplicacaoId);
  const identificacaoServico = { servicoId: servico.id, servicoNome: servico.nome };
  contexto.servicoId = servico.id;
  contexto.servicoNome = servico.nome;

  let respostaMetricas: RespostaMetricas;
  contexto.etapa = "metricas";
  try {
    respostaMetricas = await buscarMetricas(servicoApi.id);
  } catch (erro) {
    if (!(erro instanceof ErroApi)) throw erro;
    if (erro.tipo === "http" && erro.statusHttp === 500 && erro.codigoApi === "metrics_missing") {
      resolverFalha(contexto);
      contexto.etapa = "persistencia";
      await gravarColetaSemMetricas(servico.id, intervalo);
      return { ...identificacaoServico, status: "sem_metricas", resultado: "sem_metricas", intervaloSegundos: intervalo };
    }
    const falha = registrarFalha(erro, contexto);
    contexto.etapa = "persistencia";
    // HTTP 404 é reportado sem inserir uma coleta.
    if (erro.statusHttp === 404 || erro.codigoApi === "service_not_found") {
      return {
        ...identificacaoServico,
        status: "indisponivel",
        resultado: "indisponivel",
        falha,
        erro: falha.mensagem,
      };
    }
    await gravarColetaIndisponivel(servico.id, intervalo);
    return {
      ...identificacaoServico,
      status: "indisponivel",
      resultado: "indisponivel",
      falha,
      erro: falha.mensagem,
    };
  }
  resolverFalha(contexto);

  informarIntervalo?.(respostaMetricas.collection_interval_seconds);
  const intervaloSegundos = respostaMetricas.collection_interval_seconds;

  // Falhas no cálculo não descartam as métricas recebidas.
  let calculo: CalculoColeta;
  contexto.etapa = "calculo";
  try {
    if (!codigoRegiao) {
      throw new Error("Serviço sem localização: CO₂e não calculado");
    }
    calculo = await calculadoraEnergia.calcularParaServico(respostaMetricas, codigoRegiao);
    validarCalculo(calculo);
    resolverFalha({ ...contexto, etapa: "carbono" });
    resolverFalha(contexto);
  } catch (erro) {
    if (erro instanceof ErroConfiguracaoApi) throw erro;
    const falha = registrarFalha(erro, { ...contexto, etapa: erro instanceof ErroApi ? "carbono" : "calculo" });
    contexto.etapa = "persistencia";
    await gravarColetaRecebida(servico.id, respostaMetricas);
    return {
      ...identificacaoServico, status: "sucesso", resultado: "parcial", intervaloSegundos,
      falha, erro: falha.mensagem,
    };
  }

  // Persistência (fora do try-catch do cálculo para não capturar erros de BD como falha de cálculo)
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
    await anterior?.catch(() => {}); // Uma falha anterior não bloqueia a fila.
    if (cadastrosDescobertos.get(servico)?.presenca.presente === false) {
      throw new ColetaCancelada("Serviço removido antes do início da coleta");
    }
    const contexto: ContextoFalha = { etapa: "persistencia", idExterno: servico.id, servicoNome: servico.name };
    monitoramento.iniciarColeta();
    try {
      const id = aplicacaoId ?? await buscarAplicacaoId("GreenER Demo");
      if (cadastrosDescobertos.get(servico)?.presenca.presente === false) {
        throw new ColetaCancelada("Serviço removido antes do início da coleta");
      }
      const resultado = await coletarEGravarServico(servico, id, intervalo, contexto, informarIntervalo);
      resolverFalha({ ...contexto, etapa: "persistencia" });
      resolverFalha({ ...contexto, etapa: "configuracao" });
      monitoramento.concluirColeta(servico.id, resultado.resultado === "completo");
      return resultado;
    } catch (erro) {
      if (erro instanceof ColetaCancelada) throw erro;
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

  if (servicosApi.length === 0) {
    return rodada;
  }

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
  const tarefas = servicosApi.map((servicoApi) =>
    coletarServico(servicoApi, intervalo, undefined, aplicacaoId),
  );

  // Espera todas as gravações terminarem antes de reportar uma falha.
  const coletas = await Promise.allSettled(tarefas);
  const falhas: unknown[] = [];

  for (const coleta of coletas) {
    if (coleta.status === "rejected") {
      if (coleta.reason instanceof ColetaCancelada) { rodada.totalServicos--; continue; }
      falhas.push(coleta.reason);
      continue;
    }

    const resultado = coleta.value;
    rodada.detalhes.push(resultado);

    if (resultado.resultado === "completo") {
      rodada.sucessos++;
    } else if (resultado.resultado === "parcial") {
      rodada.parciais++;
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
  listarServicos: descobrirServicosMonitorados, buscarIntervaloAlternativo, coletarServico,
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
