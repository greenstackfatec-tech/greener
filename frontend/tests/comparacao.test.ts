import assert from "node:assert/strict";
import test from "node:test";
import { consultarComparacao } from "../src/services/comparacao.ts";

// Formato real de GET /analytics/comparacao (ver docs/api.md, seção 3.9).
const respostaApi = {
  dados: [
    {
      servicoId: 1, nome: "Billing API", regiao: "Sudeste", pais: "Brasil",
      totalEnergiaKwh: 0.0042, totalEmissaoCo2eG: 0.256, qtdColetas: 6,
      mediaEnergiaKwh: 0.0007, mediaEmissaoCo2eG: 0.0427,
      minEnergiaKwh: 0.0005, maxEnergiaKwh: 0.0009, minEmissaoCo2eG: 0.03, maxEmissaoCo2eG: 0.055,
    },
    {
      servicoId: 2, nome: "Search API", regiao: "Sudeste", pais: "Brasil",
      totalEnergiaKwh: 0, totalEmissaoCo2eG: 0, qtdColetas: 0,
      mediaEnergiaKwh: 0, mediaEmissaoCo2eG: 0,
      minEnergiaKwh: 0, maxEnergiaKwh: 0, minEmissaoCo2eG: 0, maxEmissaoCo2eG: 0,
    },
  ],
  periodo: { inicio: "2026-11-01T00:00:00.000Z", fim: "2026-11-02T00:00:00.000Z" },
  avisos: ['Serviço "Search API" (ID 2) não possui dados de coleta no período informado. Retornando zeros.'],
};

const inicio = new Date("2026-11-01T00:00:00.000Z");
const fim = new Date("2026-11-02T00:00:00.000Z");

test("monta a consulta com os serviços na ordem escolhida e o período em ISO", async (t) => {
  const consulta = t.mock.method(globalThis, "fetch", async () => Response.json(respostaApi));
  await consultarComparacao([2, 1], inicio, fim);
  const url = new URL(String(consulta.mock.calls[0].arguments[0]), "http://localhost");
  assert.equal(url.pathname, "/api/analytics/comparacao");
  assert.equal(url.searchParams.get("servicos"), "2,1");
  assert.equal(url.searchParams.get("inicio"), "2026-11-01T00:00:00.000Z");
  assert.equal(url.searchParams.get("fim"), "2026-11-02T00:00:00.000Z");
});

test("converte a resposta e marca o serviço sem coleta no período", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(respostaApi));
  const comparacao = await consultarComparacao([1, 2], inicio, fim);
  assert.equal(comparacao.itens.length, 2);
  assert.deepEqual(comparacao.itens[0], {
    servicoId: 1, nome: "Billing API", regiao: "Sudeste", pais: "Brasil",
    totalEnergiaKwh: 0.0042, totalEmissaoCo2eG: 0.256,
    mediaEnergiaKwh: 0.0007, mediaEmissaoCo2eG: 0.0427,
    qtdColetas: 6, semDados: false,
  });
  assert.equal(comparacao.itens[1].semDados, true);
  assert.equal(comparacao.avisos.length, 1);
});

test("campo numérico ausente é erro, e não vira zero", async (t) => {
  const semTotal = { ...respostaApi, dados: [{ ...respostaApi.dados[0], totalEnergiaKwh: undefined }] };
  t.mock.method(globalThis, "fetch", async () => Response.json(semTotal));
  await assert.rejects(consultarComparacao([1, 2], inicio, fim), /totalEnergiaKwh/);
});

test("erro 400 do backend chega com a mensagem da API", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "invalid_services", message: "Informe de 2 a 5 serviços distintos." }, { status: 400 }),
  );
  await assert.rejects(consultarComparacao([1], inicio, fim), /Informe de 2 a 5 serviços distintos/);
});
