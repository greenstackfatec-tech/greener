/**
 * Repository para gravação de coletas e resultados calculados.
 * BD05 - Repository dos resultados calculados (potência, energia e CO₂e).
 */

import pg from "pg";
import type { Servico } from "../services/services.repository.ts";
import type { RespostaMetricas } from "../../integrations/metrics-api.ts";
import type { IntensidadeCarbono } from "../../integrations/carbon-api.ts";
import type { ResultadoCalculo } from "../../calculos/calculo-energia.ts";

const pool = new pg.Pool();

/** Status possíveis de uma coleta. */
export type StatusColeta = "sucesso" | "sem_metricas" | "indisponivel";

/** Dados brutos de uma coleta para gravação. */
export interface ColetaParaGravar {
  servicoId: number;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  intervaloSegundos: number;
  statusColeta: StatusColeta;
  potenciaEstimadaW: number | null;
  duracaoSegundos: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

/**
 * Grava uma coleta com seus resultados calculados no banco.
 * @param coleta Dados da coleta incluindo métricas brutas e resultados do cálculo
 * @returns ID da coleta inserida
 * @throws Error se falhar a inserção no banco
 */
export async function gravarColeta(coleta: ColetaParaGravar): Promise<number> {
  const sql = `
    INSERT INTO metricas_servico (
      servico_id, coletado_em, cpu_percentual, memoria_gb, disco_gb, rede_gb,
      intervalo_segundos, status_coleta, potencia_estimada_w, duracao_segundos,
      energia_kwh, emissao_co2e_g, calculado_em
    ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    RETURNING id
  `;

  const valores = [
    coleta.servicoId,
    coleta.cpuPercentual,
    coleta.memoriaGb,
    coleta.discoGb,
    coleta.redeGb,
    coleta.intervaloSegundos,
    coleta.statusColeta,
    coleta.potenciaEstimadaW,
    coleta.duracaoSegundos,
    coleta.energiaKwh,
    coleta.emissaoCo2eG,
  ];

  try {
    const resultado = await pool.query(sql, valores);
    return resultado.rows[0].id;
  } catch (erro) {
    console.error("[REPOSITORY] Erro ao gravar coleta:", erro);
    throw new Error("Falha ao persistir coleta no banco de dados");
  }
}

/**
 * Grava uma coleta bem-sucedida com cálculo completo.
 * @param servico Serviço monitorado
 * @param respostaMetricas Resposta da API de métricas
 * @param intensidadeCarbono Intensidade de carbono da região
 * @param resultadoCalculo Resultado do cálculo de energia e CO₂e
 * @returns ID da coleta inserida
 */
export async function gravarColetaSucesso(
  servico: Servico,
  respostaMetricas: RespostaMetricas,
  intensidadeCarbono: IntensidadeCarbono,
  resultadoCalculo: ResultadoCalculo,
): Promise<number> {
  return gravarColeta({
    servicoId: servico.id,
    cpuPercentual: respostaMetricas.metrics.cpu_percent,
    memoriaGb: respostaMetricas.metrics.memory_gb,
    discoGb: respostaMetricas.metrics.disk_gb,
    redeGb: respostaMetricas.metrics.network_gb,
    intervaloSegundos: respostaMetricas.collection_interval_seconds,
    statusColeta: "sucesso",
    potenciaEstimadaW: resultadoCalculo.potenciaEstimadaW,
    duracaoSegundos: resultadoCalculo.duracaoSegundos,
    energiaKwh: resultadoCalculo.energiaKwh,
    emissaoCo2eG: resultadoCalculo.emissaoCo2eG,
  });
}

/**
 * Grava uma coleta sem métricas (serviço ativo mas sem dados).
 * @param servicoId ID do serviço
 * @param intervaloSegundos Intervalo de coleta configurado
 * @returns ID da coleta inserida
 */
export async function gravarColetaSemMetricas(
  servicoId: number,
  intervaloSegundos: number,
): Promise<number> {
  return gravarColeta({
    servicoId,
    cpuPercentual: null,
    memoriaGb: null,
    discoGb: null,
    redeGb: null,
    intervaloSegundos,
    statusColeta: "sem_metricas",
    potenciaEstimadaW: null,
    duracaoSegundos: null,
    energiaKwh: null,
    emissaoCo2eG: null,
  });
}

/**
 * Grava uma coleta de serviço indisponível.
 * @param servicoId ID do serviço
 * @param intervaloSegundos Intervalo de coleta configurado
 * @returns ID da coleta inserida
 */
export async function gravarColetaIndisponivel(
  servicoId: number,
  intervaloSegundos: number,
): Promise<number> {
  return gravarColeta({
    servicoId,
    cpuPercentual: null,
    memoriaGb: null,
    discoGb: null,
    redeGb: null,
    intervaloSegundos,
    statusColeta: "indisponivel",
    potenciaEstimadaW: null,
    duracaoSegundos: null,
    energiaKwh: null,
    emissaoCo2eG: null,
  });
}

/**
 * Busca o histórico de coletas de um serviço.
 * @param servicoId ID do serviço
 * @param limite Número máximo de registros
 * @returns Lista de coletas ordenadas por data (mais recente primeiro)
 */
export async function buscarHistoricoColetas(
  servicoId: number,
  limite = 100,
): Promise<
  Array<{
    id: number;
    coletadoEm: Date;
    cpuPercentual: number | null;
    memoriaGb: number | null;
    discoGb: number | null;
    redeGb: number | null;
    intervaloSegundos: number;
    statusColeta: StatusColeta;
    potenciaEstimadaW: number | null;
    duracaoSegundos: number | null;
    energiaKwh: number | null;
    emissaoCo2eG: number | null;
    calculadoEm: Date | null;
  }>
> {
  const sql = `
    SELECT
      id, coletado_em, cpu_percentual, memoria_gb, disco_gb, rede_gb,
      intervalo_segundos, status_coleta, potencia_estimada_w, duracao_segundos,
      energia_kwh, emissao_co2e_g, calculado_em
    FROM metricas_servico
    WHERE servico_id = $1
    ORDER BY coletado_em DESC
    LIMIT $2
  `;

  const resultado = await pool.query(sql, [servicoId, limite]);
  return resultado.rows.map((row) => ({
    id: row.id,
    coletadoEm: row.coletado_em,
    cpuPercentual: row.cpu_percentual,
    memoriaGb: row.memoria_gb,
    discoGb: row.disco_gb,
    redeGb: row.rede_gb,
    intervaloSegundos: row.intervalo_segundos,
    statusColeta: row.status_coleta,
    potenciaEstimadaW: row.potencia_estimada_w,
    duracaoSegundos: row.duracao_segundos,
    energiaKwh: row.energia_kwh,
    emissaoCo2eG: row.emissao_co2e_g,
    calculadoEm: row.calculado_em,
  }));
}

/** Fecha o pool de conexões (para testes/encerramento). */
export async function encerrarPool(): Promise<void> {
  await pool.end();
}
