import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { TestContext } from "node:test";
import pg from "pg";
import { tratarRequisicaoMock } from "../../mocks/app.ts";
import { metricas, servicos } from "../../mocks/fixtures.ts";
import { executarRodadaColeta } from "./collections.service.ts";

async function preparar(t: TestContext, umServico = false) {
  const consultas: { sql: string; parametros: unknown[] }[] = [];
  const caminhos: string[] = [];
  const estado = {
    falharCadastro: false,
    falharColeta: false,
    falharPrimeiroCadastro: false,
    semCarbono: false,
    falharPrimeiroCarbono: false,
    semMetricas: false,
    zerarMetricas: false,
    metricas404: false,
    intervaloZero: false,
    listaVazia: false,
  };
  const gravacoes: unknown[][] = [];
  t.mock.method(pg.Pool.prototype, "query", async (sql: string, parametros: unknown[] = []) => {
    consultas.push({ sql, parametros });
    if (sql.includes("FROM aplicacoes")) return { rows: [{ id: 7 }] };
    if (sql.includes("FROM configuracoes")) return { rows: [{ valor: "60" }] };
    if (sql.includes("FROM regioes"))
      return { rows: [{ id: parametros[1] === "Brazil" ? 11 : 12 }] };
    if (sql.includes("INSERT INTO servicos")) {
      if (
        estado.falharCadastro ||
        (estado.falharPrimeiroCadastro && parametros[0] === "servico-1")
      ) {
        throw new Error("Falha ao salvar serviço");
      }
      return {
        rows: [
          {
            id: parametros[0] === "servico-1" ? 41 : 42,
            nome: parametros[1],
            status: "ativo",
            cidade: parametros[4],
            latitude: parametros[5],
            longitude: parametros[6],
          },
        ],
      };
    }
    if (sql.includes("INSERT INTO metricas_servico")) {
      if (estado.falharColeta) throw new Error("Falha ao salvar coleta");
      gravacoes.push(parametros);
      return { rows: [{ id: consultas.length }] };
    }
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  const servidor = createServer((request, response) => {
    const caminho = new URL(request.url!, "http://localhost").pathname;
    caminhos.push(caminho);
    if (
      (estado.semCarbono && caminho.includes("/regions/")) ||
      (estado.falharPrimeiroCarbono && caminho.includes("/regions/BR-SP/"))
    ) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unavailable", message: "Carbono indisponível" }));
    } else if (estado.intervaloZero && caminho.includes("/metrics/")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ...metricas, collection_interval_seconds: 0 }));
    } else if (estado.metricas404 && caminho.includes("/metrics/")) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ error: "service_not_found", message: "Serviço não encontrado" }),
      );
    } else if (estado.semMetricas && caminho.includes("/metrics/")) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ error: "service_unavailable", message: "Serviço indisponível" }),
      );
    } else if (estado.zerarMetricas && caminho.includes("/metrics/")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          collection_interval_seconds: 60,
          metrics: { cpu_percent: 0, memory_gb: 0, disk_gb: 0, network_gb: 0 },
        }),
      );
    } else if (estado.listaVazia && caminho === "/services") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("[]");
    } else if (umServico && caminho === "/services") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(servicos.slice(0, 1)));
    } else {
      tratarRequisicaoMock(request, response);
    }
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const anteriores = [process.env.METRICS_API_URL, process.env.CARBON_API_URL];
  process.env.METRICS_API_URL = `http://127.0.0.1:${endereco.port}`;
  process.env.CARBON_API_URL = process.env.METRICS_API_URL;
  t.after(() => {
    servidor.close();
    servidor.closeAllConnections();
    ["METRICS_API_URL", "CARBON_API_URL"].forEach((chave, i) => {
      if (anteriores[i] === undefined) delete process.env[chave];
      else process.env[chave] = anteriores[i];
    });
  });
  return { consultas, caminhos, estado, gravacoes };
}

test("TP07 usa os repositories da BD04 e vincula a coleta ao ID local retornado", async (t) => {
  const { consultas, caminhos } = await preparar(t);
  const rodada = await executarRodadaColeta();
  assert.equal(rodada.sucessos, 2);
  assert.equal(rodada.erros, 0);
  const cadastros = consultas.filter((c) => c.sql.includes("INSERT INTO servicos"));
  const coletas = consultas.filter((c) => c.sql.includes("INSERT INTO metricas_servico"));
  assert.equal(cadastros.length, 2);
  assert.equal(coletas.length, 2);
  for (let i = 0; i < servicos.length; i += 1) {
    const cadastro = cadastros.find((c) => c.parametros[0] === servicos[i].id)!;
    assert.deepEqual(cadastro.parametros, [
      servicos[i].id,
      servicos[i].name,
      7,
      i === 0 ? 11 : 12,
      servicos[i].location.city,
      servicos[i].location.latitude,
      servicos[i].location.longitude,
    ]);
    const coleta = coletas.find((c) => c.parametros[0] === 41 + i)!;
    assert.ok(consultas.indexOf(cadastro) < consultas.indexOf(coleta));
    assert.deepEqual(coleta.parametros.slice(1, 7), [25, 2, 10, 0.15, 60, "sucesso"]);
    assert.equal(coleta.parametros[8], metricas.collection_interval_seconds);
    assert.ok((coleta.parametros[9] as number) > 0);
    assert.ok(caminhos.includes(`/metrics/${servicos[i].id}`));
    assert.ok(caminhos.includes(`/regions/${servicos[i].location.region_code}/carbon-intensity`));
  }
  assert.deepEqual(
    rodada.detalhes.map((d) => d.servicoId),
    [41, 42],
  );
  assert.equal(caminhos.filter((c) => c.includes("carbon-intensity")).length, 2);
  assert.equal(consultas.filter((c) => c.sql.includes("FROM regioes")).length, 2);
  assert.ok(!consultas.some((c) => /INSERT INTO regioes|UPDATE regioes/.test(c.sql)));
});

test("falha ao cadastrar serviço não tenta inserir coleta com FK inválida", async (t) => {
  const { consultas, estado } = await preparar(t, true);
  estado.falharCadastro = true;
  await assert.rejects(executarRodadaColeta, /Falha ao persistir a rodada/);
  assert.equal(consultas.filter((c) => c.sql.includes("INSERT INTO metricas_servico")).length, 0);
});

test("falha ao persistir coleta é propagada sem criar outra coleta de indisponibilidade", async (t) => {
  const { consultas, estado } = await preparar(t, true);
  estado.falharColeta = true;
  t.mock.method(console, "error", () => {});
  await assert.rejects(executarRodadaColeta, /Falha ao persistir a rodada/);
  const coletas = consultas.filter((c) => c.sql.includes("INSERT INTO metricas_servico"));
  assert.equal(coletas.length, 1);
  assert.equal(coletas[0].parametros[6], "sucesso");
});

test("carbono indisponível preserva as métricas de todos os serviços sem inventar resultados", async (t) => {
  const { estado, gravacoes } = await preparar(t);
  estado.semCarbono = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.sucessos, 2);
  assert.equal(resultado.erros, 2);
  assert.equal(resultado.indisponiveis, 0);
  assert.equal(gravacoes.length, 2);
  assert.ok(gravacoes.every((g) => g[1] === metricas.metrics.cpu_percent));
  assert.ok(gravacoes.every((g) => g.slice(7).every((valor) => valor === null)));
  assert.ok(resultado.detalhes.every((d) => d.erro && d.calculo === undefined));
});

test("falha de carbono de uma região não impede o cálculo e a gravação da outra", async (t) => {
  const { estado, gravacoes } = await preparar(t);
  estado.falharPrimeiroCarbono = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.sucessos, 2);
  assert.equal(resultado.erros, 1);
  assert.equal(gravacoes.find((g) => g[0] === 41)![9], null);
  assert.ok((gravacoes.find((g) => g[0] === 42)![9] as number) > 0);
});

test("falha no cadastro de um serviço aguarda a gravação dos demais antes de rejeitar a rodada", async (t) => {
  const { estado, gravacoes } = await preparar(t);
  estado.falharPrimeiroCadastro = true;
  await assert.rejects(executarRodadaColeta, (erro) => {
    assert.ok(erro instanceof AggregateError);
    assert.match(erro.errors[0].message, /Falha ao salvar serviço/);
    return true;
  });
  assert.equal(gravacoes.length, 1);
  assert.equal(gravacoes[0][0], 42);
});

test("falha de métricas é persistida sem consultar a API de carbono", async (t) => {
  const { estado, gravacoes, caminhos } = await preparar(t);
  estado.semMetricas = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.indisponiveis, 2);
  assert.equal(gravacoes.length, 2);
  assert.ok(gravacoes.every((g) => g[6] === "indisponivel" && g[1] === null));
  assert.ok(!caminhos.some((c) => c.includes("carbon-intensity")));
});

test("medições zeradas são preservadas sem mudar a classificação existente", async (t) => {
  const { estado, gravacoes } = await preparar(t);
  estado.zerarMetricas = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.semMetricas, 2);
  assert.equal(gravacoes.length, 2);
  assert.ok(gravacoes.every((g) => g.slice(1, 5).every((valor) => valor === 0)));
});

test("HTTP 404 depois da listagem preserva a regra existente de não gravar coleta", async (t) => {
  const { estado, gravacoes } = await preparar(t, true);
  estado.metricas404 = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.indisponiveis, 1);
  assert.equal(gravacoes.length, 0);
});

test("intervalo zero aceito pela API é preservado com duração e energia iguais a zero", async (t) => {
  const { estado, gravacoes } = await preparar(t, true);
  estado.intervaloZero = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.sucessos, 1);
  assert.equal(resultado.erros, 0);
  assert.equal(gravacoes.length, 1);
  assert.equal(gravacoes[0][5], 0);
  assert.equal(gravacoes[0][8], 0);
  assert.equal(gravacoes[0][9], 0);
  assert.equal(gravacoes[0][10], 0);
});

test("lista de serviços vazia conclui sem consultas ou gravações no banco", async (t) => {
  const { estado, consultas } = await preparar(t);
  estado.listaVazia = true;
  const resultado = await executarRodadaColeta();
  assert.equal(resultado.totalServicos, 0);
  assert.equal(resultado.erros, 0);
  assert.deepEqual(resultado.detalhes, []);
  assert.equal(consultas.length, 0);
});
