import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import {
  buscarAplicacaoId,
  buscarRegiaoId,
  listarServicos,
  salvarRegiao,
  salvarServico,
} from "./services.repository.ts";

// Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
test("repository de serviços com PostgreSQL real", async (t) => {
  const idExterno = `teste-${randomUUID()}`;
  const idExternoLegado = `${idExterno}-legado`;
  const nomeLegado = `Serviço legado ${idExternoLegado}`;
  const nomeRegiao = `Região ${idExterno}`;
  t.after(async () => {
    await consultar("DELETE FROM servicos WHERE id_externo IN ($1, $2) OR nome = $3", [
      idExterno,
      idExternoLegado,
      nomeLegado,
    ]);
    await consultar("DELETE FROM regioes WHERE nome = $1", [nomeRegiao]);
    await encerrarConexao();
  });

  const aplicacao = await consultar<{ id: number }>(
    "SELECT id::int FROM aplicacoes WHERE nome = 'GreenER Demo'",
  );
  const aplicacaoId = aplicacao.rows[0]?.id;
  assert.ok(aplicacaoId, "seed sem a aplicação GreenER Demo");

  await t.test(
    "buscarAplicacaoId encontra a aplicação e informa quando ela não existe",
    async () => {
      assert.equal(await buscarAplicacaoId("GreenER Demo"), aplicacaoId);
      await assert.rejects(
        buscarAplicacaoId(`inexistente-${idExterno}`),
        /Aplicação .* não encontrada no banco de dados/,
      );
    },
  );

  let regiaoId = 0;

  await t.test("salvarRegiao atualiza a região que já existe em vez de duplicar", async () => {
    const regiao = {
      nome: nomeRegiao,
      pais: "Brazil",
      fatorCo2eGKwh: 85,
      anoReferencia: 2026,
      fonte: "teste",
    };
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
      idExterno,
      nome: "Serviço de teste",
      aplicacaoId,
      regiaoId,
      cidade: "Sao Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
    };
    const inserido = await salvarServico(servico);
    const atualizado = await salvarServico({
      ...servico,
      cidade: null,
      latitude: null,
      longitude: null,
    });

    assert.equal(atualizado.id, inserido.id);
    assert.deepEqual(inserido, {
      id: inserido.id,
      nome: "Serviço de teste",
      status: "ativo",
      cidade: "Sao Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
    });
    assert.equal(atualizado.cidade, null);
    assert.equal(atualizado.latitude, null);
  });

  await t.test(
    "buscarRegiaoId usa nome e país e informa quando a região não está cadastrada",
    async () => {
      assert.equal(await buscarRegiaoId(nomeRegiao, "Brazil"), regiaoId);
      await assert.rejects(buscarRegiaoId(nomeRegiao, "Outro país"), /Região .* não cadastrada/);
    },
  );

  await t.test("salvarServico não associa registros legados pelo nome", async () => {
    const legado = await consultar<{ id: number }>(
      `INSERT INTO servicos (aplicacao_id, regiao_id, nome)
       VALUES ($1, $2, $3)
       RETURNING id::int`,
      [aplicacaoId, regiaoId, nomeLegado],
    );
    const idLegado = legado.rows[0]?.id;
    assert.ok(idLegado);

    const salvo = await salvarServico({
      idExterno: idExternoLegado,
      nome: nomeLegado,
      aplicacaoId,
      regiaoId,
      cidade: null,
      latitude: null,
      longitude: null,
    });

    assert.notEqual(salvo.id, idLegado);
    const preservado = await consultar<{ id_externo: string | null }>(
      "SELECT id_externo FROM servicos WHERE id = $1",
      [idLegado],
    );
    assert.equal(preservado.rows[0]?.id_externo, null);
    const duplicatas = await consultar<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM servicos
       WHERE aplicacao_id = $1 AND nome = $2`,
      [aplicacaoId, nomeLegado],
    );
    assert.equal(duplicatas.rows[0]?.total, 2);
  });

  await t.test("IDs externos diferentes permitem serviços com nomes iguais", async () => {
    const outro = await salvarServico({
      idExterno: `${idExterno}-outro`,
      nome: "Serviço de teste",
      aplicacaoId,
      regiaoId,
      cidade: null,
      latitude: null,
      longitude: null,
    });
    try {
      const existente = await consultar<{ id: number }>(
        "SELECT id::int FROM servicos WHERE id_externo = $1",
        [idExterno],
      );
      assert.notEqual(outro.id, existente.rows[0]?.id);
      await consultar("UPDATE servicos SET status = 'removido' WHERE id = $1", [outro.id]);
      const atualizado = await salvarServico({
        idExterno: `${idExterno}-outro`,
        nome: "Renomeado",
        aplicacaoId,
        regiaoId,
        cidade: null,
        latitude: null,
        longitude: null,
      });
      assert.equal(atualizado.id, outro.id);
      assert.equal(atualizado.status, "removido");
    } finally {
      await consultar("DELETE FROM servicos WHERE id = $1", [outro.id]);
    }
  });

  await t.test(
    "salvarServico atualiza o serviço existente sem reivindicar outro legado",
    async () => {
      const nomeExistente = "Serviço de teste";
      const existente = await consultar<{ id: number }>(
        "SELECT id::int FROM servicos WHERE id_externo = $1",
        [idExterno],
      );
      const idExistente = existente.rows[0]?.id;
      assert.ok(idExistente);

      const legado = await consultar<{ id: number }>(
        `INSERT INTO servicos (aplicacao_id, regiao_id, nome)
       VALUES ($1, $2, $3)
       RETURNING id::int`,
        [aplicacaoId, regiaoId, nomeExistente],
      );
      const idLegado = legado.rows[0]?.id;
      assert.ok(idLegado);

      try {
        const salvo = await salvarServico({
          idExterno,
          nome: nomeExistente,
          aplicacaoId,
          regiaoId,
          cidade: null,
          latitude: null,
          longitude: null,
        });
        assert.equal(salvo.id, idExistente);

        const legadoAtualizado = await consultar<{ id_externo: string | null }>(
          "SELECT id_externo FROM servicos WHERE id = $1",
          [idLegado],
        );
        assert.equal(legadoAtualizado.rows[0]?.id_externo, null);
      } finally {
        await consultar("DELETE FROM servicos WHERE id = $1", [idLegado]);
      }
    },
  );

  await t.test("valores vão separados do SQL, sem concatenação", async () => {
    const nomeMalicioso = "x'); DROP TABLE servicos; --";
    const salvo = await salvarServico({
      idExterno,
      nome: nomeMalicioso,
      aplicacaoId,
      regiaoId,
      cidade: null,
      latitude: null,
      longitude: null,
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
