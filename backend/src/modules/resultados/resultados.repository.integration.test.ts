// Configurar variáveis de ambiente ANTES de importar módulos que criam pools
process.env.PGHOST ??= "localhost";
process.env.PGPORT ??= "5432";
process.env.PGDATABASE ??= "greener";
process.env.PGUSER ??= "greener";
process.env.PGPASSWORD ??= "greener_dev_only";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import { gravarColeta, gravarColetaSemMetricas } from "../collections/collections.repository.ts";
import { salvarServico } from "../services/services.repository.ts";
import {
  buscarResultadoPorColeta,
  listarResultadosPorServico,
  salvarResultado,
} from "./resultados.repository.ts";

// Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
test("repository de resultados com PostgreSQL real", async (t) => {
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
  const calculo = {
    potenciaEstimadaW: 43.375, duracaoSegundos: 60, energiaKwh: 0.00072292, emissaoCo2eG: 0.0722,
  };

  await t.test("grava o resultado na coleta de origem e lê de volta os mesmos valores", async () => {
    const coletaId = await gravarColetaSemMetricas(servico.id, 60);
    assert.equal(await buscarResultadoPorColeta(coletaId), null, "ainda não calculada");

    const salvo = await salvarResultado(coletaId, calculo);
    assert.equal(salvo?.coletaId, coletaId);
    assert.equal(salvo?.servicoId, servico.id);

    const lido = await buscarResultadoPorColeta(coletaId);
    assert.equal(lido?.potenciaEstimadaW, 43.375);
    assert.equal(lido?.duracaoSegundos, 60);
    assert.equal(lido?.energiaKwh, 0.00072292);
    assert.equal(lido?.emissaoCo2eG, 0.0722);
    assert.ok(lido?.calculadoEm instanceof Date);
  });

  await t.test("coleta inexistente não grava nem devolve resultado", async () => {
    assert.equal(await salvarResultado(2147483647, calculo), null);
    assert.equal(await buscarResultadoPorColeta(2147483647), null);
  });

  await t.test("lista só os resultados calculados do serviço, do mais recente ao mais antigo", async () => {
    const maisRecente = await gravarColeta({
      servicoId: servico.id, cpuPercentual: 10, memoriaGb: 1, discoGb: 1, redeGb: 0,
      intervaloSegundos: 60, statusColeta: "sucesso", ...calculo,
    });
    await gravarColetaSemMetricas(servico.id, 60); // sem cálculo: não entra na lista

    const resultados = await listarResultadosPorServico(servico.id);
    assert.equal(resultados.length, 2);
    assert.equal(resultados[0]?.coletaId, maisRecente);
    assert.ok(resultados.every((item) => item.servicoId === servico.id));
  });
});
