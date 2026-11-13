/**
 * Testes para o repository de indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { encerrarConexao, verificarConexao } from "../../db/connection.ts";
import { buscarIndicadoresConsolidados } from "./dashboard-indicators.repository.ts";

test("indicadores e prontidão compartilham o mesmo pool de conexão", async (t) => {
  const pools = new Set<pg.Pool>();
  t.after(() => encerrarConexao());
  t.mock.method(pg.Pool.prototype, "query", async function (this: pg.Pool, sql: string) {
    pools.add(this);
    return { rows: sql === "SELECT 1" ? [] : [{
      consumo_total_kwh: "0.25",
      emissao_total_co2e_g: "15.5",
      servicos_ativos: "2",
      servicos_indisponiveis: "1",
      ultima_coleta_em: "2026-11-13T22:00:00.000Z",
    }] };
  });

  await verificarConexao();
  const indicadores = await buscarIndicadoresConsolidados();

  assert.equal(pools.size, 1);
  assert.deepEqual(indicadores, {
    consumoTotalKwh: 0.25,
    emissaoTotalCo2eG: 15.5,
    servicosAtivos: 2,
    servicosIndisponiveis: 1,
    ultimaColetaEm: new Date("2026-11-13T22:00:00.000Z"),
  });
});
