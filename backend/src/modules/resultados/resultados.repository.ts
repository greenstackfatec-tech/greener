import { consultar } from "../../db/connection.ts";
import type { ResultadoCalculo } from "../../calculos/calculo-energia.ts";

/* O resultado fica na própria linha da coleta (metricas_servico), então já nasce ligado a ela. */
export interface ResultadoSalvo extends ResultadoCalculo {
  coletaId: number;
  servicoId: number;
  calculadoEm: Date | null;
}

const COLUNAS_RESULTADO = `
  id::int AS "coletaId", servico_id::int AS "servicoId",
  potencia_estimada_w::float8 AS "potenciaEstimadaW", duracao_segundos AS "duracaoSegundos",
  energia_kwh::float8 AS "energiaKwh", emissao_co2e_g::float8 AS "emissaoCo2eG",
  calculado_em AS "calculadoEm"`;

/** Grava o resultado do cálculo na coleta de origem. Devolve null se a coleta não existe. */
export async function salvarResultado(
  coletaId: number,
  resultado: ResultadoCalculo,
): Promise<ResultadoSalvo | null> {
  const retorno = await consultar<ResultadoSalvo>(
    `UPDATE metricas_servico
     SET potencia_estimada_w = $2, duracao_segundos = $3, energia_kwh = $4,
         emissao_co2e_g = $5, calculado_em = NOW()
     WHERE id = $1
     RETURNING ${COLUNAS_RESULTADO}`,
    [
      coletaId,
      resultado.potenciaEstimadaW,
      resultado.duracaoSegundos,
      resultado.energiaKwh,
      resultado.emissaoCo2eG,
    ],
  );
  return retorno.rows[0] ?? null;
}

/** Lê o resultado de uma coleta. Devolve null se a coleta não existe ou não tem cálculo (sem métricas ou indisponível). */
export async function buscarResultadoPorColeta(coletaId: number): Promise<ResultadoSalvo | null> {
  const retorno = await consultar<ResultadoSalvo>(
    `SELECT ${COLUNAS_RESULTADO}
     FROM metricas_servico
     WHERE id = $1 AND energia_kwh IS NOT NULL`,
    [coletaId],
  );
  return retorno.rows[0] ?? null;
}

/** Resultados já calculados de um serviço, do mais recente para o mais antigo. */
export async function listarResultadosPorServico(
  servicoId: number,
  limite = 100,
): Promise<ResultadoSalvo[]> {
  const retorno = await consultar<ResultadoSalvo>(
    `SELECT ${COLUNAS_RESULTADO}
     FROM metricas_servico
     WHERE servico_id = $1 AND energia_kwh IS NOT NULL
     ORDER BY coletado_em DESC, id DESC
     LIMIT $2`,
    [servicoId, limite],
  );
  return retorno.rows;
}
