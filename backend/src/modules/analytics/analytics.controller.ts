/**
 * Controller para endpoints de analytics (BD06).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { responder } from "../../shared/http.ts";
import {
  obterHistoricoServico,
  obterRanking,
  obterComparacaoServicos,
  obterAgregacaoMetricas,
  type HistoricoFiltros,
  type RankingFiltros,
  type ComparacaoFiltros,
  type AgregacaoFiltros,
  type MetricaRanking,
  type ColunaAgregavel,
  type FuncaoAgregacao,
} from "./analytics.service.ts";

/* ---------- Helpers ---------- */

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return isNaN(n) ? undefined : n;
}

function parseArray(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  return value.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

function parseQuery(request: IncomingMessage): Record<string, string> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => { data += chunk; });
    request.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    request.on("error", reject);
  });
}

function isString(v: unknown): v is string { return typeof v === "string"; }
function isNumber(v: unknown): v is number { return typeof v === "number"; }
function isBoolean(v: unknown): v is boolean { return typeof v === "boolean"; }
function isStringArray(v: unknown): v is string[] { return Array.isArray(v) && v.every(isString); }
function isNumberArray(v: unknown): v is number[] { return Array.isArray(v) && v.every(isNumber); }

const COLUNAS_VALIDAS: ColunaAgregavel[] = ["energia_kwh", "emissao_co2e_g", "potencia_estimada_w", "cpu_percentual", "memoria_gb", "disco_gb", "rede_gb"];
const FUNCOES_VALIDAS: FuncaoAgregacao[] = ["SUM", "AVG", "MIN", "MAX", "COUNT", "STDDEV_POP"];

function validarColuna(v: string): ColunaAgregavel | null {
  return COLUNAS_VALIDAS.includes(v as ColunaAgregavel) ? v as ColunaAgregavel : null;
}
function validarFuncao(v: string): FuncaoAgregacao | null {
  return FUNCOES_VALIDAS.includes(v as FuncaoAgregacao) ? v as FuncaoAgregacao : null;
}

/* ---------- Rotas ---------- */

async function handleHistorico(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  parametros: Record<string, string>,
): Promise<void> {
  const servicoId = parseInt(parametros.servicoId, 10);
  if (isNaN(servicoId)) {
    return responder(response, 400, { erro: "servicoId inválido" });
  }

  const query = parseQuery(request);
  const filtros: HistoricoFiltros = {
    dataInicio: parseDate(query.dataInicio),
    dataFim: parseDate(query.dataFim),
    coluna: (query.coluna as HistoricoFiltros["coluna"]) || "coletado_em",
    direcao: (query.direcao as HistoricoFiltros["direcao"]) || "DESC",
    limite: parseIntOrUndefined(query.limite) || 100,
    offset: parseIntOrUndefined(query.offset) || 0,
  };

  try {
    const historico = await obterHistoricoServico(servicoId, filtros);
    return responder(response, 200, historico);
  } catch (erro) {
    console.error("[ANALYTICS] Erro ao buscar histórico:", erro);
    return responder(response, 500, { erro: "Falha ao buscar histórico" });
  }
}

async function handleRanking(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const query = parseQuery(request);
  const metrica = query.metrica as MetricaRanking;
  if (!metrica || !["energia_kwh", "emissao_co2e_g"].includes(metrica)) {
    return responder(response, 400, { erro: "Parâmetro 'metrica' obrigatório: energia_kwh | emissao_co2e_g" });
  }

  const statusValidos = ["ativo", "indisponivel", "removido"] as const;
  const statusParam = query.status ? query.status.split(",").map((s) => s.trim()) : undefined;
  const statusFiltrado = statusParam?.filter((s): s is "ativo" | "indisponivel" | "removido" => statusValidos.includes(s as any));

  const filtros: RankingFiltros = {
    dataInicio: parseDate(query.dataInicio),
    dataFim: parseDate(query.dataFim),
    servicoIds: parseArray(query.servicoIds),
    aplicacaoId: parseIntOrUndefined(query.aplicacaoId),
    status: statusFiltrado,
    limite: parseIntOrUndefined(query.limite) || 50,
    offset: parseIntOrUndefined(query.offset) || 0,
  };

  try {
    const ranking = await obterRanking(metrica, filtros);
    return responder(response, 200, ranking);
  } catch (erro) {
    console.error("[ANALYTICS] Erro ao buscar ranking:", erro);
    return responder(response, 500, { erro: "Falha ao buscar ranking" });
  }
}

async function handleComparacao(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const query = parseQuery(request);
  const servicoIds = parseArray(query.servicoIds);
  if (!servicoIds || servicoIds.length < 2) {
    return responder(response, 400, { erro: "Parâmetro 'servicoIds' obrigatório com mínimo 2 IDs (ex: 1,2,3)" });
  }

  const filtros: ComparacaoFiltros = {
    dataInicio: parseDate(query.dataInicio),
    dataFim: parseDate(query.dataFim),
  };

  try {
    const comparacao = await obterComparacaoServicos(servicoIds, filtros);
    return responder(response, 200, comparacao);
  } catch (erro) {
    console.error("[ANALYTICS] Erro ao comparar serviços:", erro);
    if (erro instanceof Error && erro.message.includes("mínimo 2")) {
      return responder(response, 400, { erro: erro.message });
    }
    return responder(response, 500, { erro: "Falha ao comparar serviços" });
  }
}

async function handleAgregar(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const body = await readBody(request);

  const coluna = isString(body.coluna) ? validarColuna(body.coluna) : null;
  const funcoes = isStringArray(body.funcoes) ? body.funcoes.map(validarFuncao).filter((f): f is FuncaoAgregacao => f !== null) : [];

  if (!coluna || funcoes.length === 0) {
    return responder(response, 400, {
      erro: "Body deve conter 'coluna' válida e 'funcoes' (array não vazio de funções válidas)",
      exemplo: {
        coluna: "energia_kwh",
        funcoes: ["SUM", "AVG", "MIN", "MAX"],
        servicoIds: [1, 2, 3],
        dataInicio: "2026-01-01",
        dataFim: "2026-12-31",
        agruparPor: "servico",
      },
      colunasValidas: COLUNAS_VALIDAS,
      funcoesValidas: FUNCOES_VALIDAS,
    });
  }

  const params: AgregacaoFiltros = {
    coluna,
    funcoes,
    servicoId: isNumber(body.servicoId) ? body.servicoId : undefined,
    servicoIds: isNumberArray(body.servicoIds) ? body.servicoIds : undefined,
    aplicacaoId: isNumber(body.aplicacaoId) ? body.aplicacaoId : undefined,
    dataInicio: isString(body.dataInicio) ? new Date(body.dataInicio) : undefined,
    dataFim: isString(body.dataFim) ? new Date(body.dataFim) : undefined,
    agruparPor: isString(body.agruparPor) ? body.agruparPor as AgregacaoFiltros["agruparPor"] : "servico",
    apenasSucesso: isBoolean(body.apenasSucesso) ? body.apenasSucesso : true,
  };

  try {
    const resultado = await obterAgregacaoMetricas(params);
    return responder(response, 200, resultado);
  } catch (erro) {
    console.error("[ANALYTICS] Erro na agregação:", erro);
    if (erro instanceof Error) {
      return responder(response, 400, { erro: erro.message });
    }
    return responder(response, 500, { erro: "Falha na agregação" });
  }
}

export const analyticsRoutes = [
  { metodo: "GET", caminho: "/analytics/historico/:servicoId", tratar: handleHistorico },
  { metodo: "GET", caminho: "/analytics/ranking", tratar: handleRanking },
  { metodo: "GET", caminho: "/analytics/comparacao", tratar: handleComparacao },
  { metodo: "POST", caminho: "/analytics/agregar", tratar: handleAgregar },
] as const;