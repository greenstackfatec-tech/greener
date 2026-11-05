import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import type { TestContext } from "node:test";
import { setTimeout } from "node:timers/promises";
import pg from "pg";
import { tratarRequisicaoMock } from "../../mocks/app.ts";
import { metricas, servicos } from "../../mocks/fixtures.ts";
import {
  executarRodadaColeta, buscarIntervaloAlternativo, coletarServico,
  iniciarRotinaColeta, rotinaColeta,
} from "./collections.service.ts";
import { criarRotinaColeta } from "./collections.scheduler.ts";
import { listarServicos } from "../../integrations/metrics-api.ts";
import { consultarMonitoramentoColeta } from "./collections.service.ts";
import { calculadoraEnergia } from "../../calculos/calculo-energia.ts";
import { regioes } from "../../mocks/fixtures.ts";

async function preparar(t: TestContext, umServico = false) {
  t.mock.method(console, "error", () => {});
  const consultas: { sql: string; parametros: unknown[] }[] = [];
  const caminhos: string[] = [];
  const estado = {
    falharCadastro: false,
    falharColeta: false,
    falharPrimeiraColeta: false,
    falharPrimeiroCadastro: false,
    semCarbono: false,
    falharPrimeiroCarbono: false,
    semMetricas: false,
    zerarMetricas: false,
    metricas404: false,
    intervaloZero: false,
    listaVazia: false,
    metricasInvalidas: false,
    intervaloApi: 60,
    cpuPercentual: 25,
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
      if (estado.falharColeta || estado.falharPrimeiraColeta) {
        estado.falharPrimeiraColeta = false;
        throw new Error("Falha ao salvar coleta");
      }
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
    } else if (estado.metricasInvalidas && caminho.startsWith("/metrics/")) {
      response.end(JSON.stringify({ ...metricas, metrics: { ...metricas.metrics, memory_gb: -1 } }));
    } else if (caminho.startsWith("/metrics/")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        ...metricas,
        collection_interval_seconds: estado.intervaloApi,
        metrics: { ...metricas.metrics, cpu_percent: estado.cpuPercentual },
      }));
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
  assert.equal(resultado.sucessos, 0);
  assert.equal(resultado.parciais, 2);
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
  assert.equal(resultado.sucessos, 1);
  assert.equal(resultado.parciais, 1);
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

test("TP06 rotina consulta novamente a API e grava cada novo estado, com recuperação de falha", async (t) => {
  const { estado, gravacoes } = await preparar(t, true);
  estado.intervaloApi = 1;
  const rotina = criarRotinaColeta({
    listarServicos, buscarIntervaloAlternativo, coletarServico,
    logger: { log() {}, warn() {}, error() {} },
  });
  t.after(() => rotina.parar());
  async function aguardar(condicao: () => boolean) {
    const limite = Date.now() + 5000;
    while (!condicao()) {
      assert.ok(Date.now() < limite, "A coleta não ocorreu no prazo esperado");
      await setTimeout(10);
    }
  }
  rotina.iniciar();
  await aguardar(() => gravacoes.length === 1);
  const primeira = structuredClone(gravacoes[0]);
  estado.semMetricas = true;
  await aguardar(() => gravacoes.length === 2);
  assert.equal(gravacoes[1][6], "indisponivel");
  estado.semMetricas = false;
  estado.cpuPercentual = 40;
  await aguardar(() => gravacoes.length === 3);
  await rotina.parar();
  assert.deepEqual(gravacoes[0], primeira);
  assert.equal(gravacoes[0][1], 25);
  assert.equal(gravacoes[2][1], 40);
  assert.equal(gravacoes[0][0], gravacoes[2][0]);
  assert.equal(gravacoes[2][5], 1);
});

test("coletas manuais concorrentes e automáticas usam a mesma fila por serviço", async (t) => {
  const { gravacoes, caminhos } = await preparar(t, true);
  const original = globalThis.fetch;
  let liberar!: () => void;
  let avisar!: () => void;
  const iniciada = new Promise<void>((resolve) => { avisar = resolve; });
  const bloqueio = new Promise<void>((resolve) => { liberar = resolve; });
  let consultasMetricas = 0;
  let emAndamento = 0;
  let maximo = 0;
  t.mock.method(globalThis, "fetch", async (...args: Parameters<typeof fetch>) => {
    if (String(args[0]).includes("/metrics/")) {
      emAndamento++;
      maximo = Math.max(maximo, emAndamento);
      if (++consultasMetricas === 1) {
        avisar();
        await bloqueio;
      }
      try { return await original(...args); }
      finally { emAndamento--; }
    }
    return original(...args);
  });
  const automatica = coletarServico(servicos[0], 60);
  await iniciada;
  const manuais = [executarRodadaColeta(), executarRodadaColeta()];
  liberar();
  await Promise.all([automatica, ...manuais]);
  assert.equal(maximo, 1);
  assert.equal(caminhos.filter((c) => c.includes("/metrics/")).length, 3);
  assert.equal(gravacoes.length, 3);
});

test("o agendador recebe o intervalo da API mesmo quando a persistência falha", async (t) => {
  const { estado } = await preparar(t, true);
  estado.intervaloApi = 90;
  estado.falharColeta = true;
  t.mock.method(console, "error", () => {});
  const intervalos: number[] = [];
  await assert.rejects(() => coletarServico(servicos[0], 60, (valor) => { intervalos.push(valor); }));
  assert.deepEqual(intervalos, [90]);
});

test("a função pública de início mantém o contrato anterior e compartilha uma única rotina", async (t) => {
  const { gravacoes } = await preparar(t, true);
  t.mock.method(console, "log", () => {});
  t.after(() => rotinaColeta.parar());
  const parar = iniciarRotinaColeta(60);
  const pararNovamente = iniciarRotinaColeta(60);
  assert.equal(typeof parar, "function");
  assert.equal(rotinaColeta.status().executando, true);
  const limite = Date.now() + 5000;
  while (gravacoes.length === 0 || rotinaColeta.status().coletasEmAndamento > 0) {
    assert.ok(Date.now() < limite, "A função pública não iniciou a coleta");
    await setTimeout(10);
  }
  assert.equal(gravacoes.length, 1);
  assert.equal(parar(), undefined);
  pararNovamente();
  await rotinaColeta.parar();
  assert.equal(rotinaColeta.status().executando, false);
});

test("métricas inválidas não chegam ao cálculo nem são gravadas como válidas", async (t) => {
  const { estado, gravacoes, caminhos } = await preparar(t, true);
  estado.metricasInvalidas = true;
  const rodada = await executarRodadaColeta();
  assert.equal(rodada.sucessos, 0);
  assert.equal(rodada.indisponiveis, 1);
  assert.equal(rodada.detalhes[0].falha?.tipo, "resposta_invalida");
  assert.equal(gravacoes[0][1], null);
  assert.equal(gravacoes[0][6], "indisponivel");
  assert.ok(!caminhos.some((c) => c.includes("/regions/")));
});

test("resultado calculado não finito preserva somente métricas brutas e informa falha de cálculo", async (t) => {
  const { gravacoes } = await preparar(t, true);
  t.mock.method(calculadoraEnergia, "calcularParaServico", async () => ({
    potenciaEstimadaW: 10, duracaoSegundos: 60, energiaKwh: Infinity, emissaoCo2eG: NaN,
    intensidadeCarbono: { ...regioes[0], region_code: "BR-SP" },
  }));
  const rodada = await executarRodadaColeta();
  assert.equal(rodada.sucessos, 0);
  assert.equal(rodada.parciais, 1);
  assert.equal(rodada.detalhes[0].falha?.etapa, "calculo");
  assert.equal(rodada.detalhes[0].calculo, undefined);
  assert.ok(gravacoes[0].slice(7).every((valor) => valor === null));
});

test("erro de configuração na integração não vira indisponibilidade externa nem grava amostra", async (t) => {
  const { gravacoes } = await preparar(t, true);
  const anterior = process.env.API_TIMEOUT_MS;
  process.env.API_TIMEOUT_MS = "inválido";
  t.after(() => {
    if (anterior === undefined) delete process.env.API_TIMEOUT_MS; else process.env.API_TIMEOUT_MS = anterior;
  });
  await assert.rejects(() => coletarServico(servicos[0], 60), TypeError);
  assert.equal(gravacoes.length, 0);
  assert.ok(consultarMonitoramentoColeta().falhasAtivas.some((f) => f.etapa === "configuracao" && f.idExterno === servicos[0].id));
});

test("falha de persistência preserva o diagnóstico externo e não provoca segunda gravação", async (t) => {
  const { estado, consultas } = await preparar(t, true);
  estado.semMetricas = true;
  estado.falharColeta = true;
  await assert.rejects(executarRodadaColeta, AggregateError);
  const falhas = consultarMonitoramentoColeta().falhasAtivas.filter((f) => f.idExterno === servicos[0].id);
  assert.ok(falhas.some((f) => f.etapa === "metricas"));
  assert.ok(falhas.some((f) => f.etapa === "persistencia"));
  assert.equal(consultas.filter((c) => c.sql.includes("INSERT INTO metricas_servico")).length, 1);
});

test("rejeição na fila não bloqueia a próxima coleta concorrente do mesmo serviço", async (t) => {
  const { estado, gravacoes } = await preparar(t, true);
  estado.falharPrimeiraColeta = true;
  const primeira = assert.rejects(() => coletarServico(servicos[0], 60));
  const segunda = coletarServico(servicos[0], 60);
  await primeira;
  assert.equal((await segunda).resultado, "completo");
  assert.equal(gravacoes.length, 1);
});

test("coleta automática publica falha e recuperação no mesmo diagnóstico da manual", async (t) => {
  const { estado } = await preparar(t, true);
  estado.intervaloApi = 1;
  estado.semCarbono = true;
  t.mock.method(console, "log", () => {});
  t.after(() => rotinaColeta.parar());
  const aguardar = async (condicao: () => boolean) => {
    const limite = Date.now() + 5000;
    while (!condicao()) {
      assert.ok(Date.now() < limite, "Diagnóstico não foi atualizado");
      await setTimeout(10);
    }
  };
  rotinaColeta.iniciar(1);
  await aguardar(() => consultarMonitoramentoColeta().falhasAtivas.some((f) => f.etapa === "carbono"));
  assert.equal(rotinaColeta.status().executando, true);
  estado.semCarbono = false;
  await aguardar(() => consultarMonitoramentoColeta().situacao === "ok");
  await rotinaColeta.parar();
  assert.equal(consultarMonitoramentoColeta().falhasAtivas.length, 0);
});
