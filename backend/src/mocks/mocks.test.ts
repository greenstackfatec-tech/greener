import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { ErroApi } from "../integrations/api-client.ts";
import {
  buscarIntensidadeCarbono, buscarRegiao, listarRegioes,
} from "../integrations/carbon-api.ts";
import {
  buscarMetricas, buscarServico, listarServicos,
} from "../integrations/metrics-api.ts";
import { cenarios, tratarRequisicaoMock } from "./app.ts";
import { metricas, regioes, servicos } from "./fixtures.ts";

test("mocks locais atendem os clientes de integração", async (t) => {
  const servidor = createServer(tratarRequisicaoMock);
  // Porta dinâmica evita conflito com o servidor usado no desenvolvimento.
  // O fechamento também acontece se uma asserção falhar.
  t.after(async () => {
    if (!servidor.listening) return;
    await new Promise<void>((resolve, reject) => {
      servidor.close((erro) => erro ? reject(erro) : resolve());
      servidor.closeAllConnections();
    });
  });
  await new Promise<void>((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      servidor.off("error", reject);
      resolve();
    });
  });
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;
  const opcoes = { baseUrl, timeoutMs: 3000 };
  const cenario = (nome: string) => ({ ...opcoes, baseUrl: `${baseUrl}/cenarios/${nome}` });
  const servico = servicos[0];
  const regiao = regioes[0];

  await t.test("lista serviços com localização e caminho das métricas", async () => {
    assert.deepEqual(await listarServicos(opcoes), servicos);
  });

  await t.test("consulta um serviço por ID", async () => {
    assert.deepEqual(await buscarServico(servico.id, opcoes), servico);
  });

  await t.test("seguir metrics_path da lista e do detalhe mantém o cenário selecionado", async () => {
    for (const nome of cenarios) {
      const urlLista = `${cenario(nome).baseUrl}/services`;
      const respostaLista = await fetch(urlLista);
      assert.equal(respostaLista.status, 200);
      const lista = await respostaLista.json();
      assert.ok(Array.isArray(lista));
      assert.equal(lista.length, servicos.length);

      for (const item of lista) {
        assert.equal(typeof item.id, "string");
        assert.equal(typeof item.metrics_path, "string");
        const respostaDetalhe = await fetch(`${urlLista}/${encodeURIComponent(item.id)}`);
        assert.equal(respostaDetalhe.status, 200);
        // O detalhe deve anunciar o mesmo caminho fornecido na lista.
        assert.deepEqual(await respostaDetalhe.json(), item);

        const respostaMetricas = await fetch(new URL(item.metrics_path, urlLista));
        const falha = nome === "servico-fora-do-ar" || nome === "sem-metricas";
        assert.equal(respostaMetricas.status, falha ? 500 : 200, `Cenário ${nome}, serviço ${item.id}`);
        const dados = await respostaMetricas.json();
        if (falha) {
          assert.ok(typeof dados === "object" && dados !== null && "error" in dados && "message" in dados);
          assert.equal(dados.error, nome === "servico-fora-do-ar" ? "service_unavailable" : "metrics_missing");
          assert.equal(typeof dados.message, "string");
        } else {
          assert.deepEqual(dados, metricas);
        }
      }
    }
    // Selecionar um cenário não pode modificar os caminhos das fixtures normais.
    assert.deepEqual(await listarServicos(opcoes), servicos);
  });

  await t.test("consulta métricas preservando intervalo, unidades e decimais", async () => {
    assert.deepEqual(await buscarMetricas(servico.id, opcoes), metricas);
  });

  await t.test("lista regiões no envelope regions/total", async () => {
    assert.deepEqual(await listarRegioes(opcoes), { regions: regioes, total: regioes.length });
  });

  await t.test("consulta uma região por código", async () => {
    assert.deepEqual(await buscarRegiao(regiao.code, opcoes), regiao);
  });

  await t.test("consulta intensidade usando a região do serviço", async () => {
    const intensidade = await buscarIntensidadeCarbono(servico.location.region_code, opcoes);
    assert.deepEqual(intensidade, {
      region_code: regiao.code,
      country: regiao.country,
      region: regiao.region,
      city: regiao.city,
      carbon_intensity_gco2e_per_kwh: regiao.carbon_intensity_gco2e_per_kwh,
      renewable_share_percent: regiao.renewable_share_percent,
    });
  });

  await t.test("identificadores ausentes geram HTTP 404 nas quatro consultas", async () => {
    const consultas = [
      {
        consultar: () => buscarServico("inexistente", opcoes),
        codigo: "service_not_found",
        mensagem: "service 'inexistente' is not listed by the aggregator",
      },
      {
        consultar: () => buscarMetricas("inexistente", opcoes),
        codigo: "metrics_not_found",
        mensagem: "metrics for service 'inexistente' are not available",
      },
      {
        consultar: () => buscarRegiao("inexistente", opcoes),
        codigo: "region_not_found",
        mensagem: "region 'inexistente' is not registered",
      },
      {
        consultar: () => buscarIntensidadeCarbono("inexistente", opcoes),
        codigo: "region_not_found",
        mensagem: "region 'inexistente' is not registered",
      },
    ];
    for (const { consultar, codigo, mensagem } of consultas) {
      await assert.rejects(consultar, (erro: unknown) => {
        assert.ok(erro instanceof ErroApi);
        assert.equal(erro.tipo, "http");
        assert.equal(erro.statusHttp, 404);
        assert.equal(erro.codigoApi, codigo);
        assert.equal(erro.message, mensagem);
        return true;
      });
    }
  });

  await t.test("serviço fora do ar continua listado, mas suas métricas geram HTTP 500", async () => {
    const listados = await listarServicos(cenario("servico-fora-do-ar"));
    assert.deepEqual(listados.map((item) => item.id), servicos.map((item) => item.id));
    await assert.rejects(() => buscarMetricas(servico.id, cenario("servico-fora-do-ar")), (erro: unknown) => {
      assert.ok(erro instanceof ErroApi);
      assert.equal(erro.tipo, "http");
      assert.equal(erro.statusHttp, 500);
      assert.equal(erro.codigoApi, "service_unavailable");
      return true;
    });
  });

  await t.test("métricas ausentes geram HTTP 500, sem substituir por zeros", async () => {
    const listados = await listarServicos(cenario("sem-metricas"));
    assert.deepEqual(listados.map((item) => item.id), servicos.map((item) => item.id));
    const resposta = await fetch(`${cenario("sem-metricas").baseUrl}/metrics/${servico.id}`);
    assert.equal(resposta.status, 500);
    const dados = await resposta.json();
    assert.ok(typeof dados === "object" && dados !== null && "error" in dados && "message" in dados);
    assert.deepEqual(Object.keys(dados).sort(), ["error", "message"]);
    // O status e o envelope são contratuais; metrics_missing é um código local ilustrativo.
    assert.equal(typeof dados.error, "string");
    assert.equal(typeof dados.message, "string");
    await assert.rejects(() => buscarMetricas(servico.id, cenario("sem-metricas")), (erro: unknown) => {
      assert.ok(erro instanceof ErroApi);
      assert.equal(erro.tipo, "http");
      assert.equal(erro.statusHttp, 500);
      assert.equal(typeof erro.codigoApi, "string");
      return true;
    });
  });

  await t.test("localização ausente gera resposta_invalida na lista e no detalhe", async () => {
    const resposta = await fetch(`${cenario("sem-localizacao").baseUrl}/services/${servico.id}`);
    assert.equal(resposta.status, 200);
    // location é obrigatório no contrato: null injeta uma resposta propositalmente inválida.
    assert.deepEqual(await resposta.json(), {
      ...servico,
      location: null,
      metrics_path: `/cenarios/sem-localizacao${servico.metrics_path}`,
    });
    for (const consultar of [
      () => listarServicos(cenario("sem-localizacao")),
      () => buscarServico(servico.id, cenario("sem-localizacao")),
    ]) {
      await assert.rejects(consultar, (erro: unknown) => {
        assert.ok(erro instanceof ErroApi);
        assert.equal(erro.tipo, "resposta_invalida");
        assert.equal(erro.statusHttp, undefined);
        return true;
      });
    }
  });

  await t.test("CORS permite GET e preflight OPTIONS do front local", async () => {
    const preflight = await fetch(`${baseUrl}/services`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET" },
    });
    assert.equal(preflight.status, 204);
    assert.equal(await preflight.text(), "");
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
    assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /\bGET\b/);
    assert.match(preflight.headers.get("access-control-allow-headers") ?? "", /Content-Type/i);
    const resposta = await fetch(`${baseUrl}/services`);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("access-control-allow-origin"), "*");
    assert.match(resposta.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    await resposta.arrayBuffer();
  });

  await t.test("cenário desconhecido informa HTTP 400 e opções disponíveis", async () => {
    assert.deepEqual(cenarios, ["normal", "servico-fora-do-ar", "sem-metricas", "sem-localizacao"]);
    const resposta = await fetch(`${baseUrl}/cenarios/nao-existe/services`);
    assert.equal(resposta.status, 400);
    const dados = await resposta.json();
    assert.ok(typeof dados === "object" && dados !== null && "error" in dados && "cenarios" in dados);
    assert.equal(dados.error, "invalid_scenario");
    assert.deepEqual(dados.cenarios, cenarios);
  });

  await t.test("cenários simultâneos não alteram as respostas normais nem as fixtures", async () => {
    const respostas = await Promise.allSettled([
      listarServicos(cenario("sem-localizacao")),
      buscarMetricas(servico.id, cenario("sem-metricas")),
      buscarMetricas(servico.id, cenario("servico-fora-do-ar")),
      listarServicos(opcoes),
      buscarMetricas(servico.id, opcoes),
      listarRegioes(opcoes),
    ]);
    for (const resposta of respostas.slice(0, 3)) assert.equal(resposta.status, "rejected");
    assert.deepEqual(respostas[3], { status: "fulfilled", value: servicos });
    assert.deepEqual(respostas[4], { status: "fulfilled", value: metricas });
    assert.deepEqual(respostas[5], { status: "fulfilled", value: { regions: regioes, total: regioes.length } });
    assert.deepEqual(await listarServicos(cenario("normal")), servicos);
    assert.deepEqual(await buscarMetricas(servico.id, opcoes), metricas);
  });
});
