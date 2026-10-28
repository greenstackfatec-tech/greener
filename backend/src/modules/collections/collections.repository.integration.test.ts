import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import { salvarServico } from "../services/services.repository.ts";
import {
  buscarHistoricoColetas,
  gravarColeta,
  gravarColetaIndisponivel,
  listarColetas,
} from "./collections.repository.ts";

// Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
test("repository de coletas com PostgreSQL real", async (t) => {
  const idExterno = `teste-${randomUUID()}`;
  t.after(async () => {
    await consultar(
      "DELETE FROM metricas_servico WHERE servico_id IN (SELECT id FROM servicos WHERE id_externo = $1)",
      [idExterno],
    );
    await consultar("DELETE FROM servicos WHERE id_externo = $1", [idExterno]);
    await encerrarConexao();
  });

  const ids = await consultar<{ aplicacao: number; regiao: number }>(
    `SELECT a.id::int AS aplicacao, r.id::int AS regiao
     FROM aplicacoes a, regioes r
     WHERE a.nome = 'GreenER Demo' AND r.nome = 'Sudeste'`,
  );
  const seed = ids.rows[0];
  assert.ok(seed, "seed sem a aplicação GreenER Demo ou a região Sudeste");
  const servico = await salvarServico({
    idExterno, nome: "Serviço de teste", aplicacaoId: seed.aplicacao, regiaoId: seed.regiao,
    cidade: null, latitude: null, longitude: null,
  });

  await t.test("grava uma coleta e lê de volta os mesmos valores", async () => {
    const id = await gravarColeta({
      servicoId: servico.id, cpuPercentual: 42.5, memoriaGb: 2, discoGb: 10.25, redeGb: 0.5,
      intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 43.375,
      duracaoSegundos: 60, energiaKwh: 0.00072292, emissaoCo2eG: 0.0722,
    });

    const [coleta] = await buscarHistoricoColetas(servico.id);
    assert.equal(coleta?.id, id);
    assert.equal(coleta?.cpuPercentual, 42.5);
    assert.equal(coleta?.discoGb, 10.25);
    assert.equal(coleta?.energiaKwh, 0.00072292);
    assert.equal(coleta?.emissaoCo2eG, 0.0722);
    assert.equal(coleta?.statusColeta, "sucesso");
  });

  await t.test("coleta de serviço indisponível fica sem métricas", async () => {
    const id = await gravarColetaIndisponivel(servico.id, 60);

    const coleta = (await buscarHistoricoColetas(servico.id)).find((item) => item.id === id);
    assert.equal(coleta?.statusColeta, "indisponivel");
    assert.equal(coleta?.cpuPercentual, null);
    assert.equal(coleta?.energiaKwh, null);
  });

  await t.test("listarColetas traz as coletas do serviço com ids numéricos", async () => {
    const coletas = (await listarColetas()).filter((coleta) => coleta.servicoId === servico.id);
    assert.equal(coletas.length, 2);
    assert.equal(typeof coletas[0]?.id, "number");
  });
});
