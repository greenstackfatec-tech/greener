import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { responder, lerId } from "../../shared/http.ts";
import { getHistorico, getRanking, getComparacao, ErroHttp } from "./analytics.service.ts";

/**
 * Extrai query parameters da URL.
 */
function extrairQuery(url: string): URLSearchParams {
  const parsed = new URL(url, "http://localhost");
  return parsed.searchParams;
}

/**
 * GET /analytics/historico/:servicoId
 * Query params: inicio, fim, apenasSucesso, limite, offset, ordenacao
 */
export async function historico(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  parametros: Record<string, string>,
): Promise<void> {
  const servicoId = lerId(parametros.servicoId);
  if (servicoId === null) {
    responder(response, 400, { error: "invalid_id", message: "O ID do serviço deve ser um número inteiro positivo." });
    return;
  }

  const query = extrairQuery(request.url ?? "");
  const inicio = query.get("inicio") || undefined;
  const fim = query.get("fim") || undefined;
  const apenasSucesso = query.get("apenasSucesso") || undefined;
  const limite = query.get("limite") || undefined;
  const offset = query.get("offset") || undefined;
  const ordenacao = query.get("ordenacao") || undefined;

  try {
    const resultado = await getHistorico(servicoId, inicio, fim, apenasSucesso, limite, offset, ordenacao);
    responder(response, 200, resultado);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      responder(response, erro.status, { error: erro.codigo, message: erro.message });
      return;
    }
    throw erro;
  }
}

/**
 * GET /analytics/ranking
 * Query params: inicio, fim, metrica, ordenacao, limite, offset, aplicacaoId, regiaoId, apenasAtivos
 */
export async function ranking(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  _parametros: Record<string, string>,
): Promise<void> {
  const query = extrairQuery(request.url ?? "");
  const inicio = query.get("inicio") || undefined;
  const fim = query.get("fim") || undefined;
  const metrica = query.get("metrica") || undefined;
  const ordenacao = query.get("ordenacao") || undefined;
  const limite = query.get("limite") || undefined;
  const offset = query.get("offset") || undefined;
  const aplicacaoId = query.get("aplicacaoId") || undefined;
  const regiaoId = query.get("regiaoId") || undefined;
  const apenasAtivos = query.get("apenasAtivos") || undefined;

  try {
    const resultado = await getRanking(inicio, fim, metrica, ordenacao, limite, offset, aplicacaoId, regiaoId, apenasAtivos);
    responder(response, 200, resultado);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      responder(response, erro.status, { error: erro.codigo, message: erro.message });
      return;
    }
    throw erro;
  }
}

/**
 * GET /analytics/comparacao
 * Query params: servicos (comma-separated IDs), inicio, fim, ordenacao
 */
export async function comparacao(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  _parametros: Record<string, string>,
): Promise<void> {
  const query = extrairQuery(request.url ?? "");
  const servicos = query.get("servicos") || undefined;
  const inicio = query.get("inicio") || undefined;
  const fim = query.get("fim") || undefined;
  const ordenacao = query.get("ordenacao") || undefined;

  try {
    const resultado = await getComparacao(servicos, inicio, fim, ordenacao);
    responder(response, 200, resultado);
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      responder(response, erro.status, { error: erro.codigo, message: erro.message });
      return;
    }
    throw erro;
  }
}