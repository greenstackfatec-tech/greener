import assert from "node:assert/strict";
import test from "node:test";
import { ErroApi } from "../src/services/api.ts";
import { consultarIndicadores } from "../src/services/indicadores.ts";
import { numero } from "../src/formatacao.ts";

// Formato real de GET /dashboard/indicadores (ver docs/api.md, seção 3.7).
const respostaApi = {
  consumo_total_kwh: 0.32345678,
  emissao_total_co2e_g: 1.25,
  servicos_ativos: 2,
  servicos_indisponiveis: 1,
  ultima_coleta_em: "2026-11-01T10:02:00.000Z",
  intervalo_coleta_segundos: 60,
};

test("converte a resposta do backend para os nomes usados no frontend", async (t) => {
  const consulta = t.mock.method(globalThis, "fetch", async () => Response.json(respostaApi));
  const indicadores = await consultarIndicadores();
  assert.equal(consulta.mock.calls[0].arguments[0], "/api/dashboard/indicadores");
  assert.deepEqual(indicadores, {
    consumoTotalKwh: 0.32345678,
    emissaoTotalCo2eG: 1.25,
    servicosAtivos: 2,
    servicosIndisponiveis: 1,
    ultimaColetaEm: "2026-11-01T10:02:00.000Z",
    intervaloColetaSegundos: 60,
  });
});

test("banco sem coletas devolve zeros, e zero é um valor válido", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ consumo_total_kwh: 0, emissao_total_co2e_g: 0, servicos_ativos: 0, servicos_indisponiveis: 0 }),
  );
  const indicadores = await consultarIndicadores();
  assert.deepEqual(indicadores, {
    consumoTotalKwh: 0, emissaoTotalCo2eG: 0, servicosAtivos: 0, servicosIndisponiveis: 0,
    ultimaColetaEm: null, intervaloColetaSegundos: null,
  });
  assert.equal(numero(indicadores.consumoTotalKwh, 4), "0");
});

test("campo ausente ou não numérico é erro, e não vira zero", async (t) => {
  const semAtivos: Record<string, unknown> = { ...respostaApi };
  delete semAtivos.servicos_ativos;
  t.mock.method(globalThis, "fetch", async () => Response.json(semAtivos));
  await assert.rejects(consultarIndicadores, /servicos_ativos/);

  t.mock.method(globalThis, "fetch", async () => Response.json({ ...respostaApi, consumo_total_kwh: "0,3" }));
  await assert.rejects(consultarIndicadores, /consumo_total_kwh/);

  t.mock.method(globalThis, "fetch", async () => Response.json({ ...respostaApi, emissao_total_co2e_g: null }));
  await assert.rejects(consultarIndicadores, /emissao_total_co2e_g/);
});

test("HTTP 500 do backend vira ErroApi com status e código", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "internal_error" }, { status: 500 }));
  await assert.rejects(consultarIndicadores, (erro: unknown) => {
    assert.ok(erro instanceof ErroApi);
    assert.equal(erro.status, 500);
    assert.equal(erro.codigo, "internal_error");
    return true;
  });
});

test("falha de rede propaga o erro, para a tela mostrar o estado de erro", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(consultarIndicadores, TypeError);
});

test("valores dos cards seguem o formato pt-BR da tabela (kWh com 4 casas, CO₂e com 3)", () => {
  assert.equal(numero(0.32345678, 4), "0,3235");
  assert.equal(numero(1234.5678, 3), "1.234,568");
  assert.equal(numero(12, 0), "12");
});
