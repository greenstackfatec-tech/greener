/**
 * Repository para indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import pg from "pg";

const pool = new pg.Pool();

/** Indicadores consolidados do ambiente. */
export interface IndicadoresConsolidados {
  consumoTotalKwh: number;
  emissaoTotalCo2eG: number;
  servicosAtivos: number;
  servicosIndisponiveis: number;
}

/**
 * Busca os indicadores consolidados do ambiente.
 * - Consumo total: soma de energia_kwh das últimas coletas bem-sucedidas por serviço
 * - Emissão total: soma de emissao_co2e_g das últimas coletas bem-sucedidas por serviço
 * - Serviços ativos: contagem de serviços com status 'ativo'
 * - Serviços indisponíveis: contagem de serviços com status 'indisponivel'
 * @returns Indicadores consolidados
 */
export async function buscarIndicadoresConsolidados(): Promise<IndicadoresConsolidados> {
  // Consulta única que busca tudo de uma vez para performance
  const sql = `
    WITH ultima_coleta_por_servico AS (
      SELECT DISTINCT ON (ms.servico_id)
        ms.servico_id,
        ms.energia_kwh,
        ms.emissao_co2e_g,
        ms.status_coleta,
        s.status as servico_status
      FROM metricas_servico ms
      JOIN servicos s ON s.id = ms.servico_id
      WHERE ms.status_coleta = 'sucesso'
        AND ms.energia_kwh IS NOT NULL
        AND ms.emissao_co2e_g IS NOT NULL
      ORDER BY ms.servico_id, ms.coletado_em DESC
    ),
    contagem_servicos AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'ativo') as servicos_ativos,
        COUNT(*) FILTER (WHERE status = 'indisponivel') as servicos_indisponiveis
      FROM servicos
    )
    SELECT
      COALESCE(SUM(l.energia_kwh), 0) as consumo_total_kwh,
      COALESCE(SUM(l.emissao_co2e_g), 0) as emissao_total_co2e_g,
      c.servicos_ativos,
      c.servicos_indisponiveis
    FROM ultima_coleta_por_servico l
    CROSS JOIN contagem_servicos c
  `;

  try {
    const resultado = await pool.query(sql);
    const row = resultado.rows[0];
    return {
      consumoTotalKwh: Number(row.consumo_total_kwh) || 0,
      emissaoTotalCo2eG: Number(row.emissao_total_co2e_g) || 0,
      servicosAtivos: Number(row.servicos_ativos) || 0,
      servicosIndisponiveis: Number(row.servicos_indisponiveis) || 0,
    };
  } catch (erro) {
    console.error("[DASHBOARD-INDICATORS-REPOSITORY] Erro ao buscar indicadores:", erro);
    throw new Error("Falha ao buscar indicadores consolidados no banco de dados");
  }
}

/** Fecha o pool de conexões (para testes/encerramento). */
export async function encerrarPool(): Promise<void> {
  await pool.end();
}