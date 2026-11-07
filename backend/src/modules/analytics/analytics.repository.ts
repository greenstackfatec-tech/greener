/**
 * Repository para consultas de análise (BD06).
 * Histórico, ranking, comparação e agregações parametrizadas.
 */

import { consultar, encerrarConexao } from "../../db/connection.ts";

/* ------------------------------------------------------------------ */
/* Tipos de saída                                                     */
/* ------------------------------------------------------------------ */

export interface PontoHistorico {
  coletadoEm: Date;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  intervaloSegundos: number | null;
  statusColeta: "sucesso" | "sem_metricas" | "indisponivel";
  potenciaEstimadaW: number | null;
  duracaoSegundos: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

export interface RankingItem {
  servicoId: number;
  nome: string;
  regiao: string | null;
  pais: string | null;
  totalEnergiaKwh: number;
  totalEmissaoCo2eG: number;
  qtdColetas: number;
  mediaEnergiaKwh: number;
  mediaEmissaoCo2eG: number;
}

export interface ComparacaoServico {
  servicoId: number;
  nome: string;
  regiao: string | null;
  pais: string | null;
  totalEnergiaKwh: number;
  totalEmissaoCo2eG: number;
  qtdColetas: number;
  mediaEnergiaKwh: number;
  mediaEmissaoCo2eG: number;
  minEnergiaKwh: number;
  maxEnergiaKwh: number;
  minEmissaoCo2eG: number;
  maxEmissaoCo2eG: number;
}

/* ------------------------------------------------------------------ */
/* Constantes de validação (evita SQL injection via estrutura)        */
/* ------------------------------------------------------------------ */

const ORDENACAO_PERMITIDA = ["ASC", "DESC"] as const;
const METRICAS_RANKING = ["energia", "co2e"] as const;
const GROUPBY_PERMITIDO = ["servico", "regiao", "aplicacao", "dia", "hora"] as const;
const METRICAS_AGREGACAO = [
  "energia_kwh",
  "emissao_co2e_g",
  "cpu_percentual",
  "memoria_gb",
  "disco_gb",
  "rede_gb",
] as const;

function validarOrdenacao(v: string): "ASC" | "DESC" {
  if (!ORDENACAO_PERMITIDA.includes(v as "ASC" | "DESC")) {
    throw new Error(`Ordenação inválida: ${v}. Use ASC ou DESC.`);
  }
  return v as "ASC" | "DESC";
}

function validarMetricaRanking(v: string): "energia" | "co2e" {
  if (!METRICAS_RANKING.includes(v as "energia" | "co2e")) {
    throw new Error(`Métrica de ranking inválida: ${v}. Use 'energia' ou 'co2e'.`);
  }
  return v as "energia" | "co2e";
}

function validarGroupBy(v: string): (typeof GROUPBY_PERMITIDO)[number] {
  if (!GROUPBY_PERMITIDO.includes(v as (typeof GROUPBY_PERMITIDO)[number])) {
    throw new Error(`groupBy inválido: ${v}. Use: ${GROUPBY_PERMITIDO.join(", ")}.`);
  }
  return v as (typeof GROUPBY_PERMITIDO)[number];
}

function validarMetricasAgregacao(arr: string[]): (typeof METRICAS_AGREGACAO)[number][] {
  if (arr.length === 0) throw new Error("Pelo menos uma métrica deve ser informada");
  const invalidos = arr.filter((m) => !METRICAS_AGREGACAO.includes(m as (typeof METRICAS_AGREGACAO)[number]));
  if (invalidos.length > 0) {
    throw new Error(`Métricas inválidas: ${invalidos.join(", ")}. Permitidas: ${METRICAS_AGREGACAO.join(", ")}.`);
  }
  return arr as (typeof METRICAS_AGREGACAO)[number][];
}

function construirCamposPermitidosOrdenacao(groupBy: string, metricas: string[]): string[] {
  // Campos base sempre disponíveis
  const base = groupBy === "dia" || groupBy === "hora"
    ? ["grupo"]
    : ["grupo", "grupo_id"];

  // Para cada métrica solicitada, adiciona sum, avg, min, max, count
  const metricasFields = metricas.flatMap((m) => {
    const key = m.replace(".", "_");
    return [
      `sum_${key}`,
      `avg_${key}`,
      `min_${key}`,
      `max_${key}`,
      `count_${key}`,
    ];
  });

  return [...base, ...metricasFields];
}

function validarCampoOrdenacao(campo: string, groupBy: string, metricas: string[]): string {
  const permitidos = construirCamposPermitidosOrdenacao(groupBy, metricas);
  if (!permitidos.includes(campo)) {
    throw new Error(`Campo de ordenação inválido para groupBy=${groupBy} com métricas [${metricas.join(", ")}]: ${campo}. Permitidos: ${permitidos.join(", ")}.`);
  }
  return campo;
}

/* ------------------------------------------------------------------ */
/* 1. Histórico por serviço e período                                 */
/* ------------------------------------------------------------------ */

export interface HistoricoParams {
  servicoId: number;
  inicio: Date;   // inclusivo
  fim: Date;      // inclusivo
  limite?: number;        // default 1000
  offset?: number;        // default 0
  ordenacao?: "ASC" | "DESC"; // default DESC (mais recente primeiro)
  apenasSucesso?: boolean;  // default true
}

/**
 * Busca o histórico de métricas de um serviço num período.
 * Retorna ordenado por coletado_em (padrão DESC).
 */
export async function buscarHistoricoPorServico(
  params: HistoricoParams,
): Promise<PontoHistorico[]> {
  const {
    servicoId,
    inicio,
    fim,
    limite = 1000,
    offset = 0,
    ordenacao = "DESC",
    apenasSucesso = true,
  } = params;

  const dir = validarOrdenacao(ordenacao);

  const sql = `
    SELECT
      coletado_em AS "coletadoEm",
      cpu_percentual::float8 AS "cpuPercentual",
      memoria_gb::float8 AS "memoriaGb",
      disco_gb::float8 AS "discoGb",
      rede_gb::float8 AS "redeGb",
      intervalo_segundos AS "intervaloSegundos",
      status_coleta AS "statusColeta",
      potencia_estimada_w::float8 AS "potenciaEstimadaW",
      duracao_segundos AS "duracaoSegundos",
      energia_kwh::float8 AS "energiaKwh",
      emissao_co2e_g::float8 AS "emissaoCo2eG"
    FROM metricas_servico
    WHERE servico_id = $1
      AND coletado_em >= $2
      AND coletado_em <= $3
      ${apenasSucesso ? "AND status_coleta = 'sucesso'" : ""}
    ORDER BY coletado_em ${dir}, id ${dir}
    LIMIT $4 OFFSET $5
  `;

  const resultado = await consultar<PontoHistorico>(sql, [
    servicoId,
    inicio,
    fim,
    limite,
    offset,
  ]);
  return resultado.rows;
}

/* ------------------------------------------------------------------ */
/* 2. Ranking por energia ou CO₂e com período                         */
/* ------------------------------------------------------------------ */

export interface RankingParams {
  inicio: Date;
  fim: Date;
  metrica: "energia" | "co2e"; // "energia" = energia_kwh, "co2e" = emissao_co2e_g
  ordenacao?: "ASC" | "DESC";   // default DESC (maior consumo/emissão primeiro)
  limite?: number;              // default 20
  offset?: number;              // default 0
  aplicacaoId?: number;         // opcional: filtrar por aplicação
  regiaoId?: number;            // opcional: filtrar por região
  apenasAtivos?: boolean;       // default true
}

/**
 * Ranking de serviços por consumo de energia ou emissão de CO₂e num período.
 * Agrega apenas coletas com status 'sucesso' e valores não-nulos.
 * totalEnergiaKwh SEMPRE soma energia_kwh (independente da métrica de ordenação).
 */
export async function buscarRankingPorPeriodo(
  params: RankingParams,
): Promise<RankingItem[]> {
  const {
    inicio,
    fim,
    metrica,
    ordenacao = "DESC",
    limite = 20,
    offset = 0,
    aplicacaoId,
    regiaoId,
    apenasAtivos = true,
  } = params;

  const dir = validarOrdenacao(ordenacao);
  const metricaValida = validarMetricaRanking(metrica);
  const colunaOrdenacao = metricaValida === "energia" ? "total_energia_kwh" : "total_emissao_co2e_g";

  const filtros: string[] = [
    "ms.status_coleta = 'sucesso'",
    "ms.energia_kwh IS NOT NULL",
    "ms.emissao_co2e_g IS NOT NULL",
    "ms.coletado_em >= $1",
    "ms.coletado_em <= $2",
  ];
  const valores: unknown[] = [inicio, fim];
  let idx = 3;

  if (aplicacaoId !== undefined) {
    filtros.push(`s.aplicacao_id = $${idx++}`);
    valores.push(aplicacaoId);
  }
  if (regiaoId !== undefined) {
    filtros.push(`s.regiao_id = $${idx++}`);
    valores.push(regiaoId);
  }
  if (apenasAtivos) {
    filtros.push(`s.status = 'ativo'`);
  }

  const sql = `
    WITH agregado AS (
      SELECT
        s.id AS servico_id,
        s.nome,
        r.nome AS regiao,
        r.pais,
        SUM(ms.energia_kwh) AS total_energia_kwh,
        SUM(ms.emissao_co2e_g) AS total_emissao_co2e_g,
        COUNT(*) AS qtd_coletas,
        AVG(ms.energia_kwh) AS media_energia_kwh,
        AVG(ms.emissao_co2e_g) AS media_emissao_co2e_g
      FROM metricas_servico ms
      JOIN servicos s ON s.id = ms.servico_id
      LEFT JOIN regioes r ON r.id = s.regiao_id
      WHERE ${filtros.join(" AND ")}
      GROUP BY s.id, s.nome, r.nome, r.pais
    )
    SELECT
      servico_id::int AS "servicoId",
      nome,
      regiao,
      pais,
      total_energia_kwh::float8 AS "totalEnergiaKwh",
      total_emissao_co2e_g::float8 AS "totalEmissaoCo2eG",
      qtd_coletas::int AS "qtdColetas",
      media_energia_kwh::float8 AS "mediaEnergiaKwh",
      media_emissao_co2e_g::float8 AS "mediaEmissaoCo2eG"
    FROM agregado
    ORDER BY ${colunaOrdenacao} ${dir}
    LIMIT $${idx++} OFFSET $${idx}
  `;

  valores.push(limite, offset);

  const resultado = await consultar<RankingItem>(sql, valores);
  return resultado.rows;
}

/* ------------------------------------------------------------------ */
/* 3. Comparação de 2+ serviços no mesmo período                      */
/* ------------------------------------------------------------------ */

export interface ComparacaoParams {
  servicoIds: number[];        // 2 ou mais IDs distintos
  inicio: Date;
  fim: Date;
  ordenacao?: "ASC" | "DESC";  // default: ordem dos IDs informados
}

/**
 * Compara múltiplos serviços no mesmo período.
 * Retorna agregações (soma, média, min, max) por serviço.
 */
export async function compararServicosPorPeriodo(
  params: ComparacaoParams,
): Promise<ComparacaoServico[]> {
  const { servicoIds, inicio, fim, ordenacao } = params;

  // Deduplicar e validar
  const idsUnicos = [...new Set(servicoIds)];
  if (idsUnicos.length < 2) {
    throw new Error("Comparação requer pelo menos 2 serviços distintos");
  }

  const dir = validarOrdenacao(ordenacao ?? "ASC");

  // Parâmetros: $1=inicio, $2=fim, $3... = ids
  const placeholders = idsUnicos.map((_, i) => `$${i + 3}`).join(", ");
  const valores: unknown[] = [inicio, fim, ...idsUnicos];

  // ORDER BY CASE usando s.id (compatível com GROUP BY) e parametrizando os IDs no CASE
  const caseClauses = idsUnicos.map((id, i) => `WHEN $${i + 3} THEN ${i}`).join(" ");
  const ordemSql = `ORDER BY CASE s.id ${caseClauses} END ${dir}`;

  const sql = `
    SELECT
      s.id::int AS "servicoId",
      s.nome,
      r.nome AS regiao,
      r.pais,
      SUM(ms.energia_kwh)::float8 AS "totalEnergiaKwh",
      SUM(ms.emissao_co2e_g)::float8 AS "totalEmissaoCo2eG",
      COUNT(*)::int AS "qtdColetas",
      AVG(ms.energia_kwh)::float8 AS "mediaEnergiaKwh",
      AVG(ms.emissao_co2e_g)::float8 AS "mediaEmissaoCo2eG",
      MIN(ms.energia_kwh)::float8 AS "minEnergiaKwh",
      MAX(ms.energia_kwh)::float8 AS "maxEnergiaKwh",
      MIN(ms.emissao_co2e_g)::float8 AS "minEmissaoCo2eG",
      MAX(ms.emissao_co2e_g)::float8 AS "maxEmissaoCo2eG"
    FROM metricas_servico ms
    JOIN servicos s ON s.id = ms.servico_id
    LEFT JOIN regioes r ON r.id = s.regiao_id
    WHERE ms.servico_id IN (${placeholders})
      AND ms.status_coleta = 'sucesso'
      AND ms.energia_kwh IS NOT NULL
      AND ms.emissao_co2e_g IS NOT NULL
      AND ms.coletado_em >= $1
      AND ms.coletado_em <= $2
    GROUP BY s.id, s.nome, r.nome, r.pais
    ${ordemSql}
  `;

  const resultado = await consultar<ComparacaoServico>(sql, valores);
  return resultado.rows;
}

/* ------------------------------------------------------------------ */
/* 4. Agregações parametrizadas (genérico)                            */
/* ------------------------------------------------------------------ */

export interface AgregacaoParams {
  inicio: Date;
  fim: Date;
  groupBy: "servico" | "regiao" | "aplicacao" | "dia" | "hora";
  metricas: ("energia_kwh" | "emissao_co2e_g" | "cpu_percentual" | "memoria_gb" | "disco_gb" | "rede_gb")[];
  filtros?: {
    servicoIds?: number[];
    aplicacaoId?: number;
    regiaoId?: number;
    apenasSucesso?: boolean; // default true
  };
  ordenacao?: { campo: string; direcao: "ASC" | "DESC" };
  limite?: number;
  offset?: number;
}

export interface LinhaAgregacao {
  grupo: string;              // valor do groupBy (ex.: nome do serviço, data, hora)
  grupoId?: number;           // ID quando groupBy é servico/regiao/aplicacao
  metricas: Record<string, number>; // soma, media, min, max, count por métrica
}

/**
 * Consulta genérica de agregação com groupBy, filtros e ordenação parametrizados.
 * Suporta groupBy: servico, regiao, aplicacao, dia, hora.
 * Métricas suportadas: energia_kwh, emissao_co2e_g, cpu_percentual, memoria_gb, disco_gb, rede_gb.
 */
export async function agregarMetricasPorPeriodo(
  params: AgregacaoParams,
): Promise<LinhaAgregacao[]> {
  const {
    inicio,
    fim,
    groupBy,
    metricas,
    filtros = {},
    ordenacao,
    limite = 100,
    offset = 0,
  } = params;

  const groupByValido = validarGroupBy(groupBy);
  const metricasValidas = validarMetricasAgregacao(metricas);

  // Mapeia groupBy para coluna, JOINs e SELECT
  const groupByMap: Record<string, { coluna: string; joins: string; select: string; groupByExtra: string }> = {
    servico: {
      coluna: "s.id",
      joins: "JOIN servicos s ON s.id = ms.servico_id",
      select: "s.id::int AS grupo_id, s.nome AS grupo",
      groupByExtra: "s.id, s.nome",
    },
    regiao: {
      coluna: "r.id",
      joins: "JOIN servicos s ON s.id = ms.servico_id LEFT JOIN regioes r ON r.id = s.regiao_id",
      select: "r.id::int AS grupo_id, r.nome AS grupo",
      groupByExtra: "r.id, r.nome",
    },
    aplicacao: {
      coluna: "a.id",
      joins: "JOIN servicos s ON s.id = ms.servico_id JOIN aplicacoes a ON a.id = s.aplicacao_id",
      select: "a.id::int AS grupo_id, a.nome AS grupo",
      groupByExtra: "a.id, a.nome",
    },
    dia: {
      coluna: "DATE(ms.coletado_em AT TIME ZONE 'UTC')",
      joins: "",
      select: "DATE(ms.coletado_em AT TIME ZONE 'UTC') AS grupo",
      groupByExtra: "DATE(ms.coletado_em AT TIME ZONE 'UTC')",
    },
    hora: {
      coluna: "DATE_TRUNC('hour', ms.coletado_em AT TIME ZONE 'UTC')",
      joins: "",
      select: "DATE_TRUNC('hour', ms.coletado_em AT TIME ZONE 'UTC') AS grupo",
      groupByExtra: "DATE_TRUNC('hour', ms.coletado_em AT TIME ZONE 'UTC')",
    },
  };

  const gb = groupByMap[groupByValido];

  // Constrói SELECT das agregações
  const aggSelect = metricasValidas
    .flatMap((m) => [
      `SUM(ms.${m})::float8 AS "sum_${m.replace(".", "_")}"`,
      `AVG(ms.${m})::float8 AS "avg_${m.replace(".", "_")}"`,
      `MIN(ms.${m})::float8 AS "min_${m.replace(".", "_")}"`,
      `MAX(ms.${m})::float8 AS "max_${m.replace(".", "_")}"`,
      `COUNT(ms.${m})::int AS "count_${m.replace(".", "_")}"`,
    ])
    .join(", ");

  // Filtros dinâmicos
  const where: string[] = [
    "ms.coletado_em >= $1",
    "ms.coletado_em <= $2",
  ];
  const valores: unknown[] = [inicio, fim];
  let idx = 3;

  if (filtros.apenasSucesso !== false) {
    where.push("ms.status_coleta = 'sucesso'");
  }
  if (filtros.servicoIds?.length) {
    where.push(`ms.servico_id IN (${filtros.servicoIds.map(() => `$${idx++}`).join(", ")})`);
    filtros.servicoIds.forEach((id) => valores.push(id));
  }

  // Para dia/hora, se houver filtro por aplicacaoId ou regiaoId, precisa do JOIN com servicos
  let joins = gb.joins;
  const precisaJoinServicos = (groupByValido === "dia" || groupByValido === "hora") &&
    (filtros.aplicacaoId !== undefined || filtros.regiaoId !== undefined);

  if (precisaJoinServicos) {
    joins = "JOIN servicos s ON s.id = ms.servico_id" + (gb.joins ? " " + gb.joins : "");
  }

  if (filtros.aplicacaoId !== undefined) {
    where.push(`s.aplicacao_id = $${idx++}`);
    valores.push(filtros.aplicacaoId);
  }
  if (filtros.regiaoId !== undefined) {
    where.push(`s.regiao_id = $${idx++}`);
    valores.push(filtros.regiaoId);
  }

  // Métricas não-nulas
  metricasValidas.forEach((m) => where.push(`ms.${m} IS NOT NULL`));

  // Ordenação validada
  let orderBy: string;
  if (ordenacao) {
    const campo = validarCampoOrdenacao(ordenacao.campo, groupByValido, metricasValidas);
    const dir = validarOrdenacao(ordenacao.direcao);
    orderBy = `ORDER BY "${campo}" ${dir}`;
  } else if (groupByValido === "dia" || groupByValido === "hora") {
    orderBy = `ORDER BY grupo DESC`;
  } else {
    const primeiroSum = `sum_${metricasValidas[0].replace(".", "_")}`;
    orderBy = `ORDER BY "${primeiroSum}" DESC`;
  }

  const sql = `
    SELECT
      ${gb.select},
      ${aggSelect}
    FROM metricas_servico ms
    ${joins}
    WHERE ${where.join(" AND ")}
    GROUP BY ${gb.groupByExtra}
    ${orderBy}
    LIMIT $${idx++} OFFSET $${idx}
  `;

  valores.push(limite, offset);

  const resultado = await consultar<any>(sql, valores);

  // Transforma linhas planas no formato agrupado por métrica
  return resultado.rows.map((row) => {
    const metricasAgg: Record<string, number> = {};
    metricasValidas.forEach((m) => {
      const key = m.replace(".", "_");
      metricasAgg[`sum_${m}`] = row[`sum_${key}`] ?? 0;
      metricasAgg[`avg_${m}`] = row[`avg_${key}`] ?? 0;
      metricasAgg[`min_${m}`] = row[`min_${key}`] ?? 0;
      metricasAgg[`max_${m}`] = row[`max_${key}`] ?? 0;
      metricasAgg[`count_${m}`] = row[`count_${key}`] ?? 0;
    });
    return {
      grupo: row.grupo,
      grupoId: row.grupo_id,
      metricas: metricasAgg,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Fechar pool (usa a função centralizada)                            */
/* ------------------------------------------------------------------ */

export async function encerrarPool(): Promise<void> {
  await encerrarConexao();
}