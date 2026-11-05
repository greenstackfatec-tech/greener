import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { tratarRequisicao } from "../../app.ts";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import { salvarServico } from "../services/services.repository.ts";
import { gravarColeta } from "./collections.repository.ts";

// Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
test("GET /collections passa por route, controller, service e repository", async (t) => {
  const idExterno = `teste-${randomUUID()}`;
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response);
  });
  t.after(async () => {
    servidor.close();
    servidor.closeAllConnections();
    await consultar(
      "DELETE FROM metricas_servico WHERE servico_id IN (SELECT id FROM servicos WHERE id_externo = $1)",
      [idExterno],
    );
    await consultar("DELETE FROM servicos WHERE id_externo = $1", [idExterno]);
    await encerrarConexao();
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;

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
  const coletaId = await gravarColeta({
    servicoId: servico.id, cpuPercentual: 42.5, memoriaGb: 2, discoGb: 10.25, redeGb: 0.5,
    intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 43.375,
    duracaoSegundos: 60, energiaKwh: 0.000723, emissaoCo2eG: 0.0441,
  });

  await t.test("com serviceId devolve só as coletas daquele serviço", async () => {
    const resposta = await fetch(`${baseUrl}/collections?serviceId=${servico.id}`);
    assert.equal(resposta.status, 200);
    const coletas = (await resposta.json()) as Array<{ id: number; energiaKwh: number }>;
    assert.equal(coletas.length, 1);
    assert.equal(coletas[0].id, coletaId);
    assert.equal(coletas[0].energiaKwh, 0.000723);
  });

  await t.test("serviceId sem coletas devolve lista vazia", async () => {
    const resposta = await fetch(`${baseUrl}/collections?serviceId=999999`);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), []);
  });

  await t.test("serviceId inválido responde 400 em JSON", async () => {
    for (const valor of ["", "abc", "0"]) {
      const resposta = await fetch(`${baseUrl}/collections?serviceId=${valor}`);
      assert.equal(resposta.status, 400, `serviceId=${valor}`);
      assert.equal(((await resposta.json()) as { error: string }).error, "invalid_id");
    }
  });

  await t.test("sem serviceId continua listando todas", async () => {
    const resposta = await fetch(`${baseUrl}/collections`);
    assert.equal(resposta.status, 200);
    const coletas = (await resposta.json()) as Array<{ id: number }>;
    assert.ok(coletas.some((coleta) => coleta.id === coletaId));
  });
});
