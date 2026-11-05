/**
 * Repository para consultas analíticas (BD06).
 * Histórico por serviço/período, ranking, comparação e agregações parametrizadas.
 */

import { consultar } from "../../db/connection.ts";

/* ---------- Tipos ---------- */

export interface FiltroPeriodo {
  dataInicio?: Date;
  dataFim?: Date;
}

export interface FiltroServico {
  servicoIds?: number[];
  aplicacaoId?: number;
  status?: ("ativo" | "indisponivel" | "removido")[];
}

export interface OpcoesOrdenacao {
  coluna?: "energia_kwh" | "emissao_co2e_g" | "coletado_em" | "servico_nome";
  direcao?: "ASC" | "DESC";
}

export interface OpcoesPaginacao {
  limite?: number;
  offset?: number;
}

/* ---------- Histórico por serviço e período ---------- */

export interface HistoricoItem {
  id: number;
  servicoId: number;
  servicoNome: string;
  coletadoEm: Date;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  intervaloSegundos: number;
  statusColeta: string;
  potenciaEstimadaW: number | null;
  duracaoSegundos: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
  calculadoEm: Date | null;
}

/**
 * Busca histórico de coletas de um serviço com filtros de período.
 * @param servicoId ID do serviço
 * @param filtro Filtros de período, ordenação e paginação
 * @returns Lista de coletas ordenadas
 */
export async function buscarHistoricoPorServico(
  servicoId: number,
  filtro: FiltroPeriodo & OpcoesOrdenacao & OpcoesPaginacao = {},
): Promise<HistoricoItem[]> {
  const { dataInicio, dataFim, coluna = "coletado_em", direcao = "DESC", limite = 100, offset = 0 } = filtro;

  const condicoes: string[] = ["ms.servico_id = $1"];
  const valores: unknown[] = [servicoId];
  let paramIdx = 2;

  if (dataInicio) {
    condicoes.push(`ms.coletado_em >= $${paramIdx++}`);
    valores.push(dataInicio);
  }
  if (dataFim) {
    condicoes.push(`ms.coletado_em <= $${paramIdx++}`);
    valores.push(dataFim);
  }

  const colunasValidas = ["coletado_em", "energia_kwh", "emissao_co2e_g", "potencia_estimada_w"];
  const ordemColuna = colunasValidas.includes(coluna) ? coluna : "coletado_em";
  const ordemDirecao = direcao === "ASC" ? "ASC" : "DESC";

  const sql = `
    SELECT
      ms.id::int,
      ms.servico_id::int AS "servicoId",
      s.nome AS "servicoNome",
      ms.coletado_em AS "coletadoEm",
      ms.cpu_percentual::float8 AS "cpuPercentual",
      ms.memoria_gb::float8 AS "memoriaGb",
      ms.disco_gb::float8 AS "discoGb",
      ms.rede_gb::float8 AS "redeGb",
      ms.intervalo_segundos::int AS "intervaloSegundos",
      ms.status_coleta AS "statusColeta",
      ms.potencia_estimada_w::float8 AS "potenciaEstimadaW",
      ms.duracao_segundos::int AS "duracaoSegundos",
      ms.energia_kwh::float8 AS "energiaKwh",
      ms.emissao_co2e_g::float8 AS "emissaoCo2eG",
      ms.calculado_em AS "calculadoEm"
    FROM metricas_servico ms
    JOIN servicos s ON s.id = ms.servico_id
    WHERE ${condicoes.join(" AND ")}
    ORDER BY ms.${ordemColuna} ${ordemDirecao}, ms.id ${ordemDirecao}
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;

  valores.push(limite, offset);

  const resultado = await consultar<HistoricoItem>(sql, valores);
  return resultado.rows;
}

/* ---------- Ranking por energia ou CO₂e com período ---------- */

export type MetricaRanking = "energia_kwh" | "emissao_co2e_g";

export interface RankingItem {
  servicoId: number;
  servicoNome: string;
  regiao: string | null;
  pais: string | null;
  valorTotal: number;
  qtdColetas: number;
  mediaPorColeta: number;
  ultimaColeta: Date | null;
}

/**
 * Ranking de serviços por energia ou CO₂e em um período.
 * @param metrica "energia_kwh" | "emissao_co2e_g"
 * @param filtro Filtros de período, serviços e paginação
 * @returns Lista ranqueada (maior para menor)
 */
export async function buscarRankingPorMetrica(
  metrica: MetricaRanking,
  filtro: FiltroPeriodo & FiltroServico & OpcoesPaginacao = {},
): Promise<RankingItem[]> {
  const { dataInicio, dataFim, servicoIds, aplicacaoId, status, limite = 50, offset = 0 } = filtro;

  const condicoes: string[] = [`ms.${metrica} IS NOT NULL`, `ms.status_coleta = 'sucesso'`];
  const valores: unknown[] = [];
  let paramIdx = 1;

  if (dataInicio) {
    condicoes.push(`ms.coletado_em >= $${paramIdx++}`);
    valores.push(dataInicio);
  }
  if (dataFim) {
    condicoes.push(`ms.coletado_em <= $${paramIdx++}`);
    valores.push(dataFim);
  }
  if (servicoIds?.length) {
    condicoes.push(`ms.servico_id = ANY($${paramIdx++})`);
    valores.push(servicoIds);
  }
  if (aplicacaoId) {
    condicoes.push(`s.aplicacao_id = $${paramIdx++}`);
    valores.push(aplicacaoId);
  }
  if (status?.length) {
    condicoes.push(`s.status = ANY($${paramIdx++})`);
    valores.push(status);
  }

  const sql = `
    WITH coletas_filtradas AS (
      SELECT
        ms.servico_id,
        ms.${metrica},
        ms.coletado_em
      FROM metricas_servico ms
      JOIN servicos s ON s.id = ms.servico_id
      WHERE ${condicoes.join(" AND ")}
    ),
    agregado AS (
      SELECT
        servico_id,
        SUM(${metrica}) AS valor_total,
        COUNT(*) AS qtd_coletas,
        AVG(${metrica}) AS media_por_coleta,
        MAX(coletado_em) AS ultima_coleta
      FROM coletas_filtradas
      GROUP BY servico_id
    )
    SELECT
      a.servico_id::int AS "servicoId",
      s.nome AS "servicoNome",
      r.nome AS "regiao",
      r.pais AS "pais",
      a.valor_total::float8 AS "valorTotal",
      a.qtd_coletas::int AS "qtdColetas",
      a.media_por_coleta::float8 AS "mediaPorColeta",
      a.ultima_coleta AS "ultimaColeta"
    FROM agregado a
    JOIN servicos s ON s.id = a.servico_id
    LEFT JOIN regioes r ON r.id = s.regiao_id
    ORDER BY a.valor_total DESC, a.servico_id
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;

  valores.push(limite, offset);

  const resultado = await consultar<RankingItem>(sql, valores);
  return resultado.rows;
}

/* ---------- Comparação de 2+ serviços no mesmo período ---------- */

export interface ComparacaoServico {
  servicoId: number;
  servicoNome: string;
  regiao: string | null;
  pais: string | null;
  qtdColetas: number;
  energia: {
    total: number;
    media: number;
    min: number;
    max: number;
    desvioPadrao: number | null;
  };
  emissao: {
    total: number;
    media: number;
    min: number;
    max: number;
    desvioPadrao: number | null;
  };
  cpu: {
    media: number | null;
    min: number | null;
    max: number | null;
  };
  memoria: {
    media: number | null;
    min: number | null;
    max: number | null;
  };
  primeiraColeta: Date | null;
  ultimaColeta: Date | null;
}

/**
 * Compara métricas agregadas de 2+ serviços no mesmo período.
 * @param servicoIds IDs dos serviços para comparar (mínimo 2)
 * @param filtro Filtros de período
 * @returns Lista com estatísticas por serviço
 */
export async function compararServicos(
  servicoIds: number[],
  filtro: FiltroPeriodo = {},
): Promise<ComparacaoServico[]> {
  if (servicoIds.length < 2) {
    throw new Error("Comparação requer pelo menos 2 serviços");
  }

  const { dataInicio, dataFim } = filtro;

  const condicoes: string[] = [
    "ms.servico_id = ANY($1)",
    "ms.status_coleta = 'sucesso'",
    "ms.energia_kwh IS NOT NULL",
    "ms.emissao_co2e_g IS NOT NULL",
  ];
  const valores: unknown[] = [servicoIds];
  let paramIdx = 2;

  if (dataInicio) {
    condicoes.push(`ms.coletado_em >= $${paramIdx++}`);
    valores.push(dataInicio);
  }
  if (dataFim) {
    condicoes.push(`ms.coletado_em <= $${paramIdx++}`);
    valores.push(dataFim);
  }

  const sql = `
    SELECT
      ms.servico_id::int AS "servicoId",
      s.nome AS "servicoNome",
      r.nome AS "regiao",
      r.pais AS "pais",
      COUNT(*)::int AS "qtdColetas",
      -- Energia
      SUM(ms.energia_kwh)::float8 AS "energiaTotal",
      AVG(ms.energia_kwh)::float8 AS "energiaMedia",
      MIN(ms.energia_kwh)::float8 AS "energiaMin",
      MAX(ms.energia_kwh)::float8 AS "energiaMax",
      CASE WHEN COUNT(*) > 1 THEN STDDEV_POP(ms.energia_kwh)::float8 ELSE NULL END AS "energiaStdDev",
      -- Emissão
      SUM(ms.emissao_co2e_g)::float8 AS "emissaoTotal",
      AVG(ms.emissao_co2e_g)::float8 AS "emissaoMedia",
      MIN(ms.emissao_co2e_g)::float8 AS "emissaoMin",
      MAX(ms.emissao_co2e_g)::float8 AS "emissaoMax",
      CASE WHEN COUNT(*) > 1 THEN STDDEV_POP(ms.emissao_co2e_g)::float8 ELSE NULL END AS "emissaoStdDev",
      -- CPU
      AVG(ms.cpu_percentual)::float8 AS "cpuMedia",
      MIN(ms.cpu_percentual)::float8 AS "cpuMin",
      MAX(ms.cpu_percentual)::float8 AS "cpuMax",
      -- Memória
      AVG(ms.memoria_gb)::float8 AS "memoriaMedia",
      MIN(ms.memoria_gb)::float8 AS "memoriaMin",
      MAX(ms.memoria_gb)::float8 AS "memoriaMax",
      -- Período
      MIN(ms.coletado_em) AS "primeiraColeta",
      MAX(ms.coletado_em) AS "ultimaColeta"
    FROM metricas_servico ms
    JOIN servicos s ON s.id = ms.servico_id
    LEFT JOIN regioes r ON r.id = s.regiao_id
    WHERE ${condicoes.join(" AND ")}
    GROUP BY ms.servico_id, s.nome, r.nome, r.pais
    ORDER BY ms.servico_id
  `;

  const resultado = await consultar<any>(sql, valores);

  return resultado.rows.map((row) => ({
    servicoId: row.servicoId,
    servicoNome: row.servicoNome,
    regiao: row.regiao,
    pais: row.pais,
    qtdColetas: row.qtdColetas,
    energia: {
      total: row.energiaTotal,
      media: row.energiaMedia,
      min: row.energiaMin,
      max: row.energiaMax,
      desvioPadrao: row.energiaStdDev,
    },
    emissao: {
      total: row.emissaoTotal,
      media: row.emissaoMedia,
      min: row.emissaoMin,
      max: row.emissaoMax,
      desvioPadrao: row.emissaoStdDev,
    },
    cpu: {
      media: row.cpuMedia,
      min: row.cpuMin,
      max: row.cpuMax,
    },
    memoria: {
      media: row.memoriaMedia,
      min: row.memoriaMin,
      max: row.memoriaMax,
    },
    primeiraColeta: row.primeiraColeta,
    ultimaColeta: row.ultimaColeta,
  }));
}

/* ---------- Agregações parametrizadas genéricas ---------- */

export type ColunaAgregavel =
  | "energia_kwh"
  | "emissao_co2e_g"
  | "potencia_estimada_w"
  | "cpu_percentual"
  | "memoria_gb"
  | "disco_gb"
  | "rede_gb";

export type FuncaoAgregacao = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "STDDEV_POP";

export interface AgregacaoParametrizada {
  servicoId?: number;
  servicoIds?: number[];
  aplicacaoId?: number;
  coluna: ColunaAgregavel;
  funcoes: FuncaoAgregacao[];
  dataInicio?: Date;
  dataFim?: Date;
  agruparPor?: "servico" | "dia" | "semana" | "mes" | "regiao";
  apenasSucesso?: boolean;
}

/**
 * Executa agregações parametrizadas sobre as métricas.
 * Útil para dashboards customizados, exportações, etc.
 * @param params Parâmetros da agregação
 * @returns Resultados da agregação (formato depende de agruparPor)
 */
export async function agregarMetricas(
  params: AgregacaoParametrizada,
): Promise<Record<string, unknown>[]> {
  const {
    servicoId,
    servicoIds,
    aplicacaoId,
    coluna,
    funcoes,
    dataInicio,
    dataFim,
    agruparPor = "servico",
    apenasSucesso = true,
  } = params;

  const colunasValidas: ColunaAgregavel[] = [
    "energia_kwh",
    "emissao_co2e_g",
    "potencia_estimada_w",
    "cpu_percentual",
    "memoria_gb",
    "disco_gb",
    "rede_gb",
  ];
  if (!colunasValidas.includes(coluna)) {
    throw new Error(`Coluna inválida: ${coluna}`);
  }
  if (!funcoes.length) {
    throw new Error("Pelo menos uma função de agregação é obrigatória");
  }

  const condicoes: string[] = [`ms.${coluna} IS NOT NULL`];
  if (apenasSucesso) {
    condicoes.push("ms.status_coleta = 'sucesso'");
  }
  const valores: unknown[] = [];
  let paramIdx = 1;

  if (servicoId) {
    condicoes.push(`ms.servico_id = $${paramIdx++}`);
    valores.push(servicoId);
  } else if (servicoIds?.length) {
    condicoes.push(`ms.servico_id = ANY($${paramIdx++})`);
    valores.push(servicoIds);
  }
  if (aplicacaoId) {
    condicoes.push(`s.aplicacao_id = $${paramIdx++}`);
    valores.push(aplicacaoId);
  }
  if (dataInicio) {
    condicoes.push(`ms.coletado_em >= $${paramIdx++}`);
    valores.push(dataInicio);
  }
  if (dataFim) {
    condicoes.push(`ms.coletado_em <= $${paramIdx++}`);
    valores.push(dataFim);
  }

  // Construir SELECT dinâmico
  const selects = funcoes.map((fn) => `${fn}(ms.${coluna}) AS "${fn.toLowerCase()}_${coluna}"`).join(", ");

  let groupBy = "";
  let extraSelects = "";
  let extraJoins = "";

  switch (agruparPor) {
    case "servico":
      groupBy = "ms.servico_id, s.nome";
      extraSelects = "ms.servico_id::int AS servico_id, s.nome AS servico_nome";
      break;
    case "dia":
      groupBy = "DATE(ms.coletado_em)";
      extraSelects = "DATE(ms.coletado_em) AS data";
      break;
    case "semana":
      groupBy = "DATE_TRUNC('week', ms.coletado_em)";
      extraSelects = "DATE_TRUNC('week', ms.coletado_em)::date AS semana_inicio";
      break;
    case "mes":
      groupBy = "DATE_TRUNC('month', ms.coletado_em)";
      extraSelects = "DATE_TRUNC('month', ms.coletado_em)::date AS mes_inicio";
      break;
    case "regiao":
      groupBy = "r.id, r.nome, r.pais";
      extraSelects = "r.id::int AS regiao_id, r.nome AS regiao_nome, r.pais AS regiao_pais";
      extraJoins = "LEFT JOIN regioes r ON r.id = s.regiao_id";
      break;
  }

  const sql = `
    SELECT ${extraSelects}, ${selects}
    FROM metricas_servico ms
    JOIN servicos s ON s.id = ms.servico_id
    ${extraJoins}
    WHERE ${condicoes.join(" AND ")}
    GROUP BY ${groupBy}
    ORDER BY ${groupBy.split(",")[0].trim()}
  `;

  const resultado = await consultar(sql, valores);
  return resultado.rows;
}