import assert from "node:assert/strict";
import test from "node:test";
import { listarServicos, situacaoDoServico } from "../src/services/servicos.ts";
import type { Servico } from "../src/services/servicos.ts";
import { rodapeDaSituacao } from "../src/estadosServico.ts";
import { numero } from "../src/formatacao.ts";

const ativo: Servico = {
  id: 41, nome: "Serviço de teste", status: "ativo", cidade: null, latitude: null,
  longitude: null, regiao: null, pais: null, coletadoEm: "2026-11-05T12:00:00.000Z",
  statusColeta: "sem_metricas", cpuPercentual: null, memoriaGb: null, discoGb: null,
  redeGb: null, energiaKwh: null, emissaoCo2eG: null,
};

test("resposta sem métricas preserva estado ativo, localização ausente e valores nulos", async (t) => {
  const consulta = t.mock.method(globalThis, "fetch", async () => Response.json([ativo]));
  const [servico] = await listarServicos();
  assert.equal(consulta.mock.calls[0].arguments[0], "/api/services");
  assert.deepEqual(servico, ativo);
  assert.equal(situacaoDoServico(servico), "sem_metricas");
  assert.equal(numero(servico.energiaKwh), "—");
  assert.equal(rodapeDaSituacao(servico, "sem_metricas", 0), "Sem métricas na última coleta");
});

test("lista usa o mesmo estado para filtros e contagens sem confundir zeros com ausência", async (t) => {
  const zerado = { ...ativo, id: 42, statusColeta: "sucesso", cpuPercentual: 0, memoriaGb: 0, discoGb: 0, redeGb: 0, energiaKwh: 0, emissaoCo2eG: 0 };
  t.mock.method(globalThis, "fetch", async () => Response.json([
    ativo, zerado,
    { ...ativo, id: 43, statusColeta: "indisponivel" },
    { ...ativo, id: 44, status: "removido" },
  ]));
  const servicos = await listarServicos();
  for (const situacao of ["ativo", "sem_metricas", "indisponivel", "removido"] as const) {
    assert.equal(servicos.filter((servico) => situacaoDoServico(servico) === situacao).length, 1);
  }
  assert.equal(numero(servicos[1].energiaKwh), "0");
  assert.equal(situacaoDoServico({ ...servicos[1], energiaKwh: null }), "ativo");
});

test("primeira coleta é distinguida de ausência confirmada e dados omitidos ficam nulos", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([{ id: 41, nome: ativo.nome, status: "ativo" }]));
  const [servico] = await listarServicos();
  assert.equal(servico.statusColeta, null);
  assert.equal(servico.cpuPercentual, null);
  assert.equal(rodapeDaSituacao(servico, situacaoDoServico(servico), 0), "Aguardando primeira coleta");
});

test("falha HTTP e resposta inválida não viram uma lista de serviços sem métricas", async (t) => {
  const consulta = t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 500 }));
  await assert.rejects(listarServicos, /HTTP 500/);
  consulta.mock.mockImplementation(async () => Response.json({ error: "metrics_missing" }));
  await assert.rejects(listarServicos, /esperado um array/);
  consulta.mock.mockImplementation(async () => Response.json([{}]));
  await assert.rejects(listarServicos, /item sem id, nome ou status/);
});
