import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as esperar } from "node:timers/promises";
import { consultarJson, ErroApi, ErroConfiguracaoApi } from "./api-client.ts";
import { buscarMetricas } from "./metrics-api.ts";
import { buscarIntensidadeCarbono, buscarRegiao, listarRegioes } from "./carbon-api.ts";
import { metricas, regioes } from "../mocks/fixtures.ts";

const base = "https://api.example.test";
const json = (dados: unknown): typeof fetch => async () => Response.json(dados);
const ehErro = (tipo: string) => (erro: unknown) => erro instanceof ErroApi && erro.tipo === tipo;

test("HTTP não 2xx é erro mesmo com corpo não JSON e não provoca retry", async () => {
  let chamadas = 0;
  await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
    fetchImpl: async () => { chamadas++; return new Response("<html>erro</html>", { status: 500 }); },
  }), (erro) => erro instanceof ErroApi && erro.tipo === "http" && erro.statusHttp === 500);
  assert.equal(chamadas, 1);
});

test("JSON inválido e erro de rede mantêm categorias distintas", async () => {
  await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
    fetchImpl: async () => new Response("{invalido"),
  }), ehErro("resposta_invalida"));
  const causa = new TypeError("conexão interrompida");
  await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
    fetchImpl: async () => { throw causa; },
  }), (erro) => erro instanceof ErroApi && erro.tipo === "rede" && erro.cause === causa);
});

test("timeout abrange espera pelos headers e leitura do corpo, com uma chamada por tentativa", async () => {
  for (const aguardarCorpo of [false, true]) {
    let chamadas = 0;
    let sinal: AbortSignal | undefined;
    await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
      timeoutMs: 20,
      fetchImpl: async (_url, init) => {
        chamadas++;
        sinal = init!.signal!;
        const pendente = () => new Promise<never>((_resolve, reject) => {
          sinal!.addEventListener("abort", () => reject(sinal!.reason), { once: true });
        });
        if (!aguardarCorpo) return pendente();
        const resposta = new Response();
        Object.defineProperty(resposta, "text", { value: pendente });
        return resposta;
      },
    }), ehErro("timeout"));
    assert.equal(chamadas, 1);
    assert.equal(sinal!.aborted, true);
  }
});

test("timer é limpo após sucesso ou erro HTTP e ErroApi já classificado é preservado", async () => {
  for (const status of [200, 503]) {
    let sinal: AbortSignal | undefined;
    const chamada = consultarJson(base, "TEST_API_URL", "/services", {
      timeoutMs: 20,
      fetchImpl: async (_url, init) => { sinal = init!.signal!; return Response.json([], { status }); },
    });
    if (status === 200) assert.deepEqual(await chamada, []);
    else await assert.rejects(chamada, ehErro("http"));
    await esperar(30);
    assert.equal(sinal!.aborted, false);
  }
  const original = new ErroApi("resposta_invalida", "erro classificado");
  await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
    fetchImpl: async () => { throw original; },
  }), (erro) => erro === original);
});

test("configuração inválida não executa fetch e não vira erro de rede", async () => {
  for (const opcoes of [
    { baseUrl: "url inválida" }, { baseUrl: "file:///arquivo" }, { baseUrl: "https://senha@api.test" },
    { baseUrl: `${base}?token=segredo` }, { timeoutMs: 0 }, { timeoutMs: 1.5 }, { timeoutMs: 2_147_483_648 },
  ]) {
    let chamadas = 0;
    await assert.rejects(() => consultarJson(base, "TEST_API_URL", "/services", {
      ...opcoes, fetchImpl: async () => { chamadas++; return Response.json([]); },
    }), ErroConfiguracaoApi);
    assert.equal(chamadas, 0);
  }
});

test("métricas rejeitam valores negativos, não finitos e estrutura inválida sem corrigir valores", async () => {
  for (const campo of ["memory_gb", "disk_gb", "network_gb", "cpu_percent"]) {
    for (const valor of [-1, null, "25"]) {
      await assert.rejects(() => buscarMetricas("a", {
        baseUrl: base, fetchImpl: json({ ...metricas, metrics: { ...metricas.metrics, [campo]: valor } }),
      }), ehErro("resposta_invalida"));
    }
  }
  for (const dados of [{}, { metrics: null }, { ...metricas, collection_interval_seconds: -1 },
    { ...metricas, metrics: { ...metricas.metrics, cpu_percent: 101 } }]) {
    await assert.rejects(() => buscarMetricas("a", { baseUrl: base, fetchImpl: json(dados) }), ehErro("resposta_invalida"));
  }
  const zero = await buscarMetricas("a", { baseUrl: base, fetchImpl: json({ ...metricas, collection_interval_seconds: 0 }) });
  assert.equal(zero.collection_interval_seconds, 0);
});

test("todas as rotas de carbono validam intensidade e percentual renovável", async () => {
  for (const campo of ["carbon_intensity_gco2e_per_kwh", "renewable_share_percent"]) {
    for (const valor of campo === "renewable_share_percent" ? [-1, 101, null] : [-1, null]) {
      const regiao = { ...regioes[0], region_code: "BR-SP", [campo]: valor };
      await assert.rejects(() => buscarIntensidadeCarbono("BR-SP", { baseUrl: base, fetchImpl: json(regiao) }), ehErro("resposta_invalida"));
      await assert.rejects(() => buscarRegiao("BR-SP", { baseUrl: base, fetchImpl: json(regiao) }), ehErro("resposta_invalida"));
      await assert.rejects(() => listarRegioes({ baseUrl: base, fetchImpl: json({ regions: [regiao], total: 1 }) }), ehErro("resposta_invalida"));
    }
  }
});
