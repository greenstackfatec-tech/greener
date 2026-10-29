/**
 * Testes para o repository de indicadores consolidados do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buscarIndicadoresConsolidados, encerrarPool } from "./dashboard-indicators.repository.ts";

test("buscarIndicadoresConsolidados - função existe e é exportada", () => {
  assert.equal(typeof buscarIndicadoresConsolidados, "function");
});

test("encerrarPool - função existe e é exportada", () => {
  assert.equal(typeof encerrarPool, "function");
});

await encerrarPool();