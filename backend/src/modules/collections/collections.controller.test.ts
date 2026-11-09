import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import pg from "pg";
import { tratarRequisicao } from "../../app.ts";
import { tratarRequisicaoMock } from "../../mocks/app.ts";
import { consultarMonitoramentoColeta } from "./collections.service.ts";
import { ErroApi } from "../../integrations/api-client.ts";

test("contratos HTTP de coleta, diagnóstico e recuperação", async (t) => {
  const estado = { modo: "normal", falharBanco: false, gravacoes: 0, externas: 0 };
  const consulta = t.mock.method(pg.Pool.prototype, "query", async (sql: string, parametros: unknown[] = []) => {
    if (estado.falharBanco) throw new Error("SQL interno senha=segredo");
    if (sql.includes("FROM aplicacoes")) return { rows: [{ id: 7 }] };
    if (sql.includes("FROM configuracoes")) return { rows: [{ valor: "60" }] };
    if (sql.includes("WITH anteriores AS MATERIALIZED")) return { rows: [] };
    if (sql.includes("FROM regioes")) return { rows: [{ id: 11 }] };
    if (sql.includes("INSERT INTO servicos")) return { rows: [{ id: parametros[0] === "servico-1" ? 41 : 42, nome: parametros[1] }] };
    if (sql.includes("INSERT INTO metricas_servico")) { estado.gravacoes++; return { rows: [{ id: 1 }] }; }
    if (sql === "SELECT 1") return { rows: [{ resultado: 1 }] };
    throw new Error(`Consulta inesperada: ${sql}`);
  });
  t.mock.method(console, "error", () => {});
  const mock = createServer((request, response) => {
    estado.externas++;
    const caminho = new URL(request.url!, "http://localhost").pathname;
    if (estado.modo === "timeout" && caminho === "/services") return;
    if (estado.modo === "vazio" && caminho === "/services") { response.end("[]"); return; }
    if (estado.modo === "invalido" && caminho === "/services") { response.end("{invalido"); return; }
    if ((estado.modo === "carbono" && caminho.includes("/regions/"))
        || (estado.modo === "metricas" && caminho.includes("/metrics/"))
        || (estado.modo === "descoberta" && caminho === "/services")) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "segredo", message: "senha=segredo" }));
      return;
    }
    tratarRequisicaoMock(request, response);
  });
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response).catch(() => { response.writeHead(500); response.end(); });
  });
  for (const app of [mock, servidor]) {
    t.after(() => { app.close(); app.closeAllConnections(); });
    await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  }
  const enderecoMock = mock.address();
  const endereco = servidor.address();
  assert.ok(enderecoMock && typeof enderecoMock !== "string");
  assert.ok(endereco && typeof endereco !== "string");
  const anteriores = [process.env.METRICS_API_URL, process.env.CARBON_API_URL, process.env.API_TIMEOUT_MS];
  process.env.METRICS_API_URL = `http://127.0.0.1:${enderecoMock.port}`;
  process.env.CARBON_API_URL = process.env.METRICS_API_URL;
  process.env.API_TIMEOUT_MS = "1000";
  t.after(() => {
    ["METRICS_API_URL", "CARBON_API_URL", "API_TIMEOUT_MS"].forEach((chave, i) => {
      if (anteriores[i] === undefined) delete process.env[chave]; else process.env[chave] = anteriores[i];
    });
  });
  const base = `http://127.0.0.1:${endereco.port}`;
  const executar = () => fetch(`${base}/collections/executar`, { method: "POST" });

  await t.test("status inicial não consulta APIs ou banco nem inicia coletas", async () => {
    const antes = consultarMonitoramentoColeta();
    const resposta = await fetch(`${base}/collections/rotina/status`);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    const corpo = await resposta.json() as { dados: { executando: boolean; monitoramento: unknown } };
    assert.equal(corpo.dados.executando, false);
    assert.deepEqual(corpo.dados.monitoramento, antes);
    assert.equal(estado.externas, 0);
    assert.equal(consulta.mock.calls.length, 0);
  });

  await t.test("coleta completa, parcial e totalmente indisponível usam envelopes explícitos", async () => {
    for (const [modo, resultado, sucessos, parciais, indisponiveis] of [
      ["normal", "completo", 2, 0, 0], ["carbono", "parcial", 0, 2, 0], ["metricas", "falha", 0, 0, 2],
    ] as const) {
      estado.modo = modo;
      const resposta = await executar();
      assert.equal(resposta.status, 200);
      const corpo = await resposta.json() as { sucesso: boolean; resultado: string; dados: { sucessos: number; parciais: number; indisponiveis: number } };
      assert.equal(corpo.sucesso, modo === "normal");
      assert.equal(corpo.resultado, resultado);
      assert.equal(corpo.dados.sucessos, sucessos);
      assert.equal(corpo.dados.parciais, parciais);
      assert.equal(corpo.dados.indisponiveis, indisponiveis);
      assert.ok(!JSON.stringify(corpo).includes("segredo"));
    }
    assert.equal(consultarMonitoramentoColeta().situacao, "degradado");
    estado.modo = "normal";
    await executar();
    assert.equal(consultarMonitoramentoColeta().situacao, "ok");
    assert.equal(consultarMonitoramentoColeta().falhasAtivas.length, 0);
  });

  await t.test("descoberta inválida, HTTP e timeout não gravam amostras e preservam saúde HTTP", async () => {
    const gravacoes = estado.gravacoes;
    for (const [modo, status, codigo] of [
      ["descoberta", 502, "external_api_failure"], ["invalido", 502, "external_api_failure"], ["timeout", 504, "external_api_timeout"],
    ] as const) {
      estado.modo = modo;
      process.env.API_TIMEOUT_MS = modo === "timeout" ? "30" : "1000";
      const resposta = await executar();
      assert.equal(resposta.status, status);
      const corpo = await resposta.json() as { error: string; message: string };
      assert.equal(corpo.error, codigo);
      assert.ok(corpo.message);
      assert.ok(!JSON.stringify(corpo).includes("segredo"));
      assert.equal((await fetch(`${base}/health/live`)).status, 200);
      assert.equal((await fetch(`${base}/health/ready`)).status, 200);
    }
    assert.equal(estado.gravacoes, gravacoes);
    estado.modo = "normal";
    process.env.API_TIMEOUT_MS = "1000";
    await executar();
    assert.equal(consultarMonitoramentoColeta().situacao, "ok");
  });

  await t.test("erro de rede na descoberta responde 502 e configuração inválida responde 500", async (t) => {
    const original = globalThis.fetch;
    const mockFetch = t.mock.method(globalThis, "fetch", async (...args: Parameters<typeof fetch>) => {
      if (String(args[0]).startsWith(process.env.METRICS_API_URL!)) throw new ErroApi("rede", "segredo");
      return original(...args);
    });
    assert.equal((await executar()).status, 502);
    mockFetch.mock.restore();
    process.env.API_TIMEOUT_MS = "inválido";
    const resposta = await executar();
    assert.equal(resposta.status, 500);
    assert.equal((await resposta.json() as { error: string }).error, "internal_error");
    process.env.API_TIMEOUT_MS = "1000";
    await executar();
  });

  await t.test("falha de banco responde 500 sem detalhes internos; lista vazia é sucesso explícito", async () => {
    estado.falharBanco = true;
    const falha = await executar();
    assert.equal(falha.status, 500);
    assert.ok(!(await falha.text()).includes("segredo"));
    estado.falharBanco = false;
    await executar();
    estado.modo = "vazio";
    const resposta = await executar();
    assert.equal(resposta.status, 200);
    const corpo = await resposta.json() as { sucesso: boolean; resultado: string; mensagem: string };
    assert.equal(corpo.sucesso, true);
    assert.equal(corpo.resultado, "completo");
    assert.match(corpo.mensagem, /não retornou serviços/);
  });
});
