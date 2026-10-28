import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import { listarServicos, salvarRegiao, salvarServico } from "./services.repository.ts";

// Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
test("repository de serviços com PostgreSQL real", async (t) => {
  const idExterno = `teste-${randomUUID()}`;
  const nomeRegiao = `Região ${idExterno}`;
  t.after(async () => {
    await consultar("DELETE FROM servicos WHERE id_externo = $1", [idExterno]);
    await consultar("DELETE FROM regioes WHERE nome = $1", [nomeRegiao]);
    await encerrarConexao();
  });

  const aplicacao = await consultar<{ id: number }>("SELECT id::int FROM aplicacoes WHERE nome = 'GreenER Demo'");
  const aplicacaoId = aplicacao.rows[0]?.id;
  assert.ok(aplicacaoId, "seed sem a aplicação GreenER Demo");

  let regiaoId = 0;

  await t.test("salvarRegiao atualiza a região que já existe em vez de duplicar", async () => {
    const regiao = { nome: nomeRegiao, pais: "Brazil", fatorCo2eGKwh: 85, anoReferencia: 2026, fonte: "teste" };
    regiaoId = await salvarRegiao(regiao);
    const mesmoId = await salvarRegiao({ ...regiao, fatorCo2eGKwh: 90.5 });

    assert.equal(mesmoId, regiaoId);
    const salva = await consultar<{ fator: number }>(
      "SELECT fator_co2e_g_kwh::float8 AS fator FROM regioes WHERE id = $1",
      [regiaoId],
    );
    assert.equal(salva.rows[0]?.fator, 90.5);
  });

  await t.test("salvarServico insere e depois atualiza pelo id_externo", async () => {
    const servico = {
      idExterno, nome: "Serviço de teste", aplicacaoId, regiaoId,
      cidade: "Sao Paulo", latitude: -23.5505, longitude: -46.6333,
    };
    const inserido = await salvarServico(servico);
    const atualizado = await salvarServico({ ...servico, cidade: null, latitude: null, longitude: null });

    assert.equal(atualizado.id, inserido.id);
    assert.deepEqual(inserido, {
      id: inserido.id, nome: "Serviço de teste", status: "ativo",
      cidade: "Sao Paulo", latitude: -23.5505, longitude: -46.6333,
    });
    assert.equal(atualizado.cidade, null);
    assert.equal(atualizado.latitude, null);
  });

  await t.test("valores vão separados do SQL, sem concatenação", async () => {
    const nomeMalicioso = "x'); DROP TABLE servicos; --";
    const salvo = await salvarServico({
      idExterno, nome: nomeMalicioso, aplicacaoId, regiaoId, cidade: null, latitude: null, longitude: null,
    });
    assert.equal(salvo.nome, nomeMalicioso);
  });

  await t.test("listarServicos traz o serviço salvo com números, não texto", async () => {
    const servicos = await listarServicos();
    const salvo = servicos.find((servico) => servico.nome === "x'); DROP TABLE servicos; --");
    assert.ok(salvo);
    assert.equal(typeof salvo.id, "number");
    assert.equal(servicos[0]?.nome, "Billing API");
    assert.equal(typeof servicos[0]?.latitude, "number");
  });
});
