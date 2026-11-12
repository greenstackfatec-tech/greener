import {
  buscarHistoricoPorServico,
  buscarRankingPorPeriodo,
  compararServicosPorPeriodo,
  type HistoricoParams,
  type RankingParams,
  type ComparacaoParams,
  type PontoHistorico,
  type RankingItem,
  type ComparacaoServico,
} from "./analytics.repository.ts";

/**
 * Erro HTTP para respostas de erro padronizadas.
 */
export class ErroHttp extends Error {
  public readonly status: number;
  public readonly codigo: string;

  constructor(status: number, codigo: string, message: string) {
    super(message);
    this.name = "ErroHttp";
    this.status = status;
    this.codigo = codigo;
  }
}

/**
 * Valida e normaliza parâmetros de período.
 * Lança ErroHttp 400 se inválido.
 */
function validarPeriodo(inicioStr: string | undefined, fimStr: string | undefined): { inicio: Date; fim: Date } {
  if (!inicioStr || !fimStr) {
    throw new ErroHttp(400, "invalid_period", "Parâmetros 'inicio' e 'fim' são obrigatórios no formato ISO 8601 (ex.: 2026-11-01T00:00:00Z).");
  }

  const inicio = new Date(inicioStr);
  const fim = new Date(fimStr);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw new ErroHttp(400, "invalid_period", "Datas inválidas. Use formato ISO 8601 (ex.: 2026-11-01T00:00:00Z).");
  }

  if (inicio > fim) {
    throw new ErroHttp(400, "invalid_period", "O período de início deve ser anterior ou igual ao fim.");
  }

  return { inicio, fim };
}

/**
 * Valida lista de IDs de serviços para comparação.
 * Lança ErroHttp 400 se inválido.
 */
function validarIdsComparacao(idsStr: string | undefined): number[] {
  if (!idsStr) {
    throw new ErroHttp(400, "invalid_services", "Parâmetro 'servicos' é obrigatório. Informe 2 a 5 IDs separados por vírgula (ex.: ?servicos=1,2,3).");
  }

  const ids = idsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s));

  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new ErroHttp(400, "invalid_services", "Todos os IDs devem ser números inteiros positivos.");
  }

  const unicos = [...new Set(ids)];

  if (unicos.length < 2) {
    throw new ErroHttp(400, "invalid_services", "A comparação requer pelo menos 2 serviços distintos.");
  }

  if (unicos.length > 5) {
    throw new ErroHttp(400, "invalid_services", "A comparação aceita no máximo 5 serviços.");
  }

  return unicos;
}

/**
 * Valida parâmetros de ranking.
 */
function validarRankingParams(
  metrica: string | undefined,
  ordenacao: string | undefined,
  limite: string | undefined,
  offset: string | undefined,
  aplicacaoId: string | undefined,
  regiaoId: string | undefined,
  apenasAtivos: string | undefined,
): Omit<RankingParams, "inicio" | "fim"> {
  if (!metrica) {
    throw new ErroHttp(400, "invalid_metric", "Parâmetro 'metrica' é obrigatório. Use 'energia' ou 'co2e'.");
  }
  if (metrica !== "energia" && metrica !== "co2e") {
    throw new ErroHttp(400, "invalid_metric", "Métrica inválida. Use 'energia' ou 'co2e'.");
  }

  if (ordenacao && ordenacao !== "ASC" && ordenacao !== "DESC") {
    throw new ErroHttp(400, "invalid_order", "Ordenação inválida. Use 'ASC' ou 'DESC'.");
  }

  const lim = limite !== undefined && limite !== "" ? Number(limite) : 20;
  const off = offset !== undefined && offset !== "" ? Number(offset) : 0;

  if (!Number.isSafeInteger(lim) || lim < 0) {
    throw new ErroHttp(400, "invalid_limit", "Limite deve ser um inteiro não negativo.");
  }
  if (!Number.isSafeInteger(off) || off < 0) {
    throw new ErroHttp(400, "invalid_offset", "Offset deve ser um inteiro não negativo.");
  }

  const appId = (aplicacaoId !== undefined && aplicacaoId !== "") ? Number(aplicacaoId) : undefined;
  if (appId !== undefined && (!Number.isSafeInteger(appId) || appId <= 0)) {
    throw new ErroHttp(400, "invalid_application", "ID da aplicação deve ser um inteiro positivo.");
  }

  const regId = (regiaoId !== undefined && regiaoId !== "") ? Number(regiaoId) : undefined;
  if (regId !== undefined && (!Number.isSafeInteger(regId) || regId <= 0)) {
    throw new ErroHttp(400, "invalid_region", "ID da região deve ser um inteiro positivo.");
  }

  const apenasAtivosBool = apenasAtivos === "false" ? false : true;

  return {
    metrica: metrica as "energia" | "co2e",
    ordenacao: (ordenacao ?? "DESC") as "ASC" | "DESC",
    limite: lim,
    offset: off,
    aplicacaoId: appId,
    regiaoId: regId,
    apenasAtivos: apenasAtivosBool,
  };
}

/**
 * Busca histórico de métricas de um serviço em um período.
 */
export async function getHistorico(
  servicoId: number,
  inicioStr: string | undefined,
  fimStr: string | undefined,
  apenasSucessoStr: string | undefined = "true",
  limiteStr: string | undefined,
  offsetStr: string | undefined,
  ordenacaoStr: string | undefined,
): Promise<{ dados: PontoHistorico[]; periodo: { inicio: string; fim: string } }> {
  const { inicio, fim } = validarPeriodo(inicioStr, fimStr);

  if (!Number.isSafeInteger(servicoId) || servicoId <= 0) {
    throw new ErroHttp(400, "invalid_service", "ID do serviço deve ser um inteiro positivo.");
  }

  const apenasSucesso = apenasSucessoStr !== "false";
  const limite = (limiteStr !== undefined && limiteStr !== "") ? Number(limiteStr) : 1000;
  const offset = (offsetStr !== undefined && offsetStr !== "") ? Number(offsetStr) : 0;
  const ordenacao = (ordenacaoStr && ordenacaoStr !== "" ? ordenacaoStr : "DESC") as "ASC" | "DESC";

  if (!Number.isSafeInteger(limite) || limite < 0) {
    throw new ErroHttp(400, "invalid_limit", "Limite deve ser um inteiro não negativo.");
  }
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new ErroHttp(400, "invalid_offset", "Offset deve ser um inteiro não negativo.");
  }
  if (ordenacao !== "ASC" && ordenacao !== "DESC") {
    throw new ErroHttp(400, "invalid_order", "Ordenação inválida. Use 'ASC' ou 'DESC'.");
  }

  const params: HistoricoParams = {
    servicoId,
    inicio,
    fim,
    apenasSucesso,
    limite,
    offset,
    ordenacao,
  };

  const dados = await buscarHistoricoPorServico(params);

  return {
    dados,
    periodo: {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    },
  };
}

/**
 * Busca ranking de serviços por energia ou CO₂e em um período.
 */
export async function getRanking(
  inicioStr: string | undefined,
  fimStr: string | undefined,
  metrica: string | undefined,
  ordenacao: string | undefined,
  limite: string | undefined,
  offset: string | undefined,
  aplicacaoId: string | undefined,
  regiaoId: string | undefined,
  apenasAtivos: string | undefined,
): Promise<{ dados: RankingItem[]; periodo: { inicio: string; fim: string }; metrica: string; ordenacao: string }> {
  const { inicio, fim } = validarPeriodo(inicioStr, fimStr);
  const rankingParams = validarRankingParams(metrica, ordenacao, limite, offset, aplicacaoId, regiaoId, apenasAtivos);

  const params: RankingParams = {
    inicio,
    fim,
    ...rankingParams,
  };

  const dados = await buscarRankingPorPeriodo(params);

  return {
    dados,
    periodo: {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    },
    metrica: String(rankingParams.metrica),
    ordenacao: String(rankingParams.ordenacao),
  };
}

/**
 * Compara múltiplos serviços no mesmo período.
 * Serviços sem dados no período aparecem zerados com aviso.
 * Ordem final segue a ordem dos IDs informados (ASC) ou invertida (DESC).
 */
export async function getComparacao(
  servicosStr: string | undefined,
  inicioStr: string | undefined,
  fimStr: string | undefined,
  ordenacaoStr: string | undefined,
): Promise<{ dados: ComparacaoServico[]; periodo: { inicio: string; fim: string }; avisos: string[] }> {
  const { inicio, fim } = validarPeriodo(inicioStr, fimStr);
  const servicoIds = validarIdsComparacao(servicosStr);

  const ordenacao = (ordenacaoStr && ordenacaoStr !== "" ? ordenacaoStr : "ASC") as "ASC" | "DESC";
  if (ordenacao !== "ASC" && ordenacao !== "DESC") {
    throw new ErroHttp(400, "invalid_order", "Ordenação inválida. Use 'ASC' ou 'DESC'.");
  }

  // Repositório sempre retorna em ordem dos IDs (ASC); o service fará a ordenação final
  const params: ComparacaoParams = {
    servicoIds,
    inicio,
    fim,
    ordenacao: "ASC",
  };

  const resultados = await compararServicosPorPeriodo(params);

  // Identificar serviços solicitados que não retornaram dados
  const resultadosPorId = new Map(resultados.map((r) => [r.servicoId, r]));
  const idsSemDados = servicoIds.filter((id) => !resultadosPorId.has(id));

  // Buscar nomes dos serviços sem dados para o aviso
  const avisos: string[] = [];
  if (idsSemDados.length > 0) {
    const { buscarServicoPorId } = await import("../services/services.repository.ts");
    for (const id of idsSemDados) {
      const servico = await buscarServicoPorId(id);
      const nome = servico?.nome ?? `ID ${id}`;
      avisos.push(`Serviço "${nome}" (ID ${id}) não possui dados de coleta no período informado. Retornando zeros.`);
    }
  }

  // Construir array final na ordem dos IDs solicitados
  const dadosCompletos: ComparacaoServico[] = [];
  for (const id of servicoIds) {
    const existente = resultadosPorId.get(id);
    if (existente) {
      dadosCompletos.push(existente);
    } else {
      const servico = await (await import("../services/services.repository.ts")).buscarServicoPorId(id);
      dadosCompletos.push({
        servicoId: id,
        nome: servico?.nome ?? `ID ${id}`,
        regiao: servico?.regiao ?? null,
        pais: servico?.pais ?? null,
        totalEnergiaKwh: 0,
        totalEmissaoCo2eG: 0,
        qtdColetas: 0,
        mediaEnergiaKwh: 0,
        mediaEmissaoCo2eG: 0,
        minEnergiaKwh: 0,
        maxEnergiaKwh: 0,
        minEmissaoCo2eG: 0,
        maxEmissaoCo2eG: 0,
      });
    }
  }

  // Inverter se DESC
  if (ordenacao === "DESC") {
    dadosCompletos.reverse();
  }

  return {
    dados: dadosCompletos,
    periodo: {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
    },
    avisos,
  };
}