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
type Agrupamento = (typeof GROUPBY_PERMITIDO)[number];
type MetricaAgregacao = (typeof METRICAS_AGREGACAO)[number];
type CampoAgregado = `${"sum" | "avg" | "min" | "max" | "count"}_${MetricaAgregacao}`;

function validarPeriodo(inicio: Date, fim: Date): void {
  if (!(inicio instanceof Date) || !Number.isFinite(inicio.getTime()) ||
      !(fim instanceof Date) || !Number.isFinite(fim.getTime())) {
    throw new TypeError("Início e fim devem ser datas válidas");
  }
  if (inicio > fim) throw new RangeError("Início deve ser anterior ou igual ao fim");
}

function validarId(id: number, campo: string): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError(`${campo} deve ser um inteiro positivo seguro`);
  }
}

function validarIds(ids: number[], campo: string): number[] {
  if (!Array.isArray(ids)) throw new TypeError(`${campo} deve ser uma lista de IDs`);
  for (const id of ids) validarId(id, campo);
  return [...new Set(ids)];
}

function validarPaginacao(limite: number, offset: number): void {
  for (const [campo, valor] of [["limite", limite], ["offset", offset]] as const) {
    if (!Number.isSafeInteger(valor) || valor < 0) {
      throw new TypeError(`${campo} deve ser um inteiro não negativo seguro`);
    }
  }
}

function validarBooleano(valor: boolean | undefined, campo: string): void {
  if (valor !== undefined && typeof valor !== "boolean") {
    throw new TypeError(`${campo} deve ser booleano`);
  }
}

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

function validarMetricasAgregacao(arr: string[]): MetricaAgregacao[] {
  if (!Array.isArray(arr)) throw new TypeError("Métricas devem ser uma lista");
  if (arr.length === 0) throw new Error("Pelo menos uma métrica deve ser informada");
  const invalidos = arr.filter((m) => !METRICAS_AGREGACAO.includes(m as (typeof METRICAS_AGREGACAO)[number]));
  if (invalidos.length > 0) {
    throw new Error(`Métricas inválidas: ${invalidos.join(", ")}. Permitidas: ${METRICAS_AGREGACAO.join(", ")}.`);
  }
  return [...new Set(arr)] as MetricaAgregacao[];
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

  validarPeriodo(inicio, fim);
  validarId(servicoId, "servicoId");
  validarPaginacao(limite, offset);
  validarBooleano(apenasSucesso, "apenasSucesso");
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

  validarPeriodo(inicio, fim);
  validarPaginacao(limite, offset);
  validarBooleano(apenasAtivos, "apenasAtivos");
  if (aplicacaoId !== undefined) validarId(aplicacaoId, "aplicacaoId");
  if (regiaoId !== undefined) validarId(regiaoId, "regiaoId");
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
      servico_id::float8 AS "servicoId",
      nome,
      regiao,
      pais,
      total_energia_kwh::float8 AS "totalEnergiaKwh",
      total_emissao_co2e_g::float8 AS "totalEmissaoCo2eG",
      qtd_coletas::float8 AS "qtdColetas",
      media_energia_kwh::float8 AS "mediaEnergiaKwh",
      media_emissao_co2e_g::float8 AS "mediaEmissaoCo2eG"
    FROM agregado
    ORDER BY ${colunaOrdenacao} ${dir}, servico_id ASC
    LIMIT $${idx++} OFFSET $${idx}
  `;

  valores.push(limite, offset);

  const resultado = await consultar<RankingItem>(sql, valores);
  for (const linha of resultado.rows) validarId(linha.servicoId, "servicoId");
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

  validarPeriodo(inicio, fim);
  // Deduplicar e validar
  const idsUnicos = validarIds(servicoIds, "servicoIds");
  if (idsUnicos.length < 2) {
    throw new Error("Comparação requer pelo menos 2 serviços distintos");
  }

  const dir = validarOrdenacao(ordenacao === undefined ? "ASC" : ordenacao);

  const valores: unknown[] = [inicio, fim, idsUnicos];

  const sql = `
    SELECT
      s.id::float8 AS "servicoId",
      s.nome,
      r.nome AS regiao,
      r.pais,
      SUM(ms.energia_kwh)::float8 AS "totalEnergiaKwh",
      SUM(ms.emissao_co2e_g)::float8 AS "totalEmissaoCo2eG",
      COUNT(*)::float8 AS "qtdColetas",
      AVG(ms.energia_kwh)::float8 AS "mediaEnergiaKwh",
      AVG(ms.emissao_co2e_g)::float8 AS "mediaEmissaoCo2eG",
      MIN(ms.energia_kwh)::float8 AS "minEnergiaKwh",
      MAX(ms.energia_kwh)::float8 AS "maxEnergiaKwh",
      MIN(ms.emissao_co2e_g)::float8 AS "minEmissaoCo2eG",
      MAX(ms.emissao_co2e_g)::float8 AS "maxEmissaoCo2eG"
    FROM metricas_servico ms
    JOIN servicos s ON s.id = ms.servico_id
    LEFT JOIN regioes r ON r.id = s.regiao_id
    WHERE ms.servico_id = ANY($3::bigint[])
      AND ms.status_coleta = 'sucesso'
      AND ms.energia_kwh IS NOT NULL
      AND ms.emissao_co2e_g IS NOT NULL
      AND ms.coletado_em >= $1
      AND ms.coletado_em <= $2
    GROUP BY s.id, s.nome, r.nome, r.pais
    ORDER BY array_position($3::bigint[], s.id) ${dir}
  `;

  const resultado = await consultar<ComparacaoServico>(sql, valores);
  for (const linha of resultado.rows) validarId(linha.servicoId, "servicoId");
  return resultado.rows;
}

/* ------------------------------------------------------------------ */
/* 4. Agregações parametrizadas (genérico)                            */
/* ------------------------------------------------------------------ */

export interface AgregacaoParams {
  inicio: Date;
  fim: Date;
  groupBy: Agrupamento;
  metricas: MetricaAgregacao[];
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
  grupo: string | null;       // dia/hora em UTC; null quando a região é desconhecida
  grupoId?: number | null;    // ID quando groupBy é servico/regiao/aplicacao
  metricas: Record<string, number>; // soma, media, min, max, count por métrica
}

type LinhaAgregacaoBanco = {
  grupo: string | null;
  grupo_id?: number | null;
} & Record<CampoAgregado, number>;

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

  validarPeriodo(inicio, fim);
  validarPaginacao(limite, offset);
  if (typeof filtros !== "object" || filtros === null || Array.isArray(filtros)) {
    throw new TypeError("Filtros devem ser um objeto");
  }
  validarBooleano(filtros.apenasSucesso, "apenasSucesso");
  if (filtros.aplicacaoId !== undefined) validarId(filtros.aplicacaoId, "aplicacaoId");
  if (filtros.regiaoId !== undefined) validarId(filtros.regiaoId, "regiaoId");
  const servicoIds = filtros.servicoIds === undefined ? undefined : validarIds(filtros.servicoIds, "servicoIds");
  if (ordenacao !== undefined && (typeof ordenacao !== "object" || ordenacao === null || Array.isArray(ordenacao))) {
    throw new TypeError("Ordenação deve ser um objeto");
  }
  const groupByValido = validarGroupBy(groupBy);
  const metricasValidas = validarMetricasAgregacao(metricas);

  // Mapeia groupBy para coluna, JOINs e SELECT
  const groupByMap: Record<Agrupamento, { joins: string; select: string; groupByExtra: string }> = {
    servico: {
      joins: "JOIN servicos s ON s.id = ms.servico_id",
      select: "s.id::float8 AS grupo_id, s.nome AS grupo",
      groupByExtra: "s.id, s.nome",
    },
    regiao: {
      joins: "JOIN servicos s ON s.id = ms.servico_id LEFT JOIN regioes r ON r.id = s.regiao_id",
      select: "r.id::float8 AS grupo_id, r.nome AS grupo",
      groupByExtra: "r.id, r.nome",
    },
    aplicacao: {
      joins: "JOIN servicos s ON s.id = ms.servico_id JOIN aplicacoes a ON a.id = s.aplicacao_id",
      select: "a.id::float8 AS grupo_id, a.nome AS grupo",
      groupByExtra: "a.id, a.nome",
    },
    dia: {
      joins: "",
      select: "TO_CHAR(DATE(ms.coletado_em AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS grupo",
      groupByExtra: "DATE(ms.coletado_em AT TIME ZONE 'UTC')",
    },
    hora: {
      joins: "",
      select: `TO_CHAR(DATE_TRUNC('hour', ms.coletado_em AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS grupo`,
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
      `COUNT(ms.${m})::float8 AS "count_${m.replace(".", "_")}"`,
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
  if (servicoIds !== undefined) {
    where.push(`ms.servico_id = ANY($${idx++}::bigint[])`);
    valores.push(servicoIds);
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
    const desempate = groupByValido !== "dia" && groupByValido !== "hora" && campo !== "grupo_id"
      ? ", grupo_id ASC NULLS LAST" : "";
    orderBy = `ORDER BY "${campo}" ${dir}${desempate}`;
  } else if (groupByValido === "dia" || groupByValido === "hora") {
    orderBy = `ORDER BY grupo DESC`;
  } else {
    const primeiroSum = `sum_${metricasValidas[0].replace(".", "_")}`;
    orderBy = `ORDER BY "${primeiroSum}" DESC, grupo_id ASC NULLS LAST`;
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

  const resultado = await consultar<LinhaAgregacaoBanco>(sql, valores);

  // Transforma linhas planas no formato agrupado por métrica
  return resultado.rows.map((row) => {
    if (row.grupo_id !== undefined && row.grupo_id !== null) validarId(row.grupo_id, "grupoId");
    const metricasAgg: Record<string, number> = {};
    metricasValidas.forEach((m) => {
      metricasAgg[`sum_${m}`] = row[`sum_${m}`];
      metricasAgg[`avg_${m}`] = row[`avg_${m}`];
      metricasAgg[`min_${m}`] = row[`min_${m}`];
      metricasAgg[`max_${m}`] = row[`max_${m}`];
      metricasAgg[`count_${m}`] = row[`count_${m}`];
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
