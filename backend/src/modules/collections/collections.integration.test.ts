import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { setTimeout } from "node:timers/promises";
import pg from "pg";
import { tratarRequisicaoMock } from "../../mocks/app.ts";
import { metricas, regioes, servicos } from "../../mocks/fixtures.ts";
import { criarRotinaColeta } from "./collections.scheduler.ts";
import type { ServicoComUltimaColeta } from "../services/services.repository.ts";
import type { IndicadoresDashboard } from "../dashboard-indicators/dashboard-indicators.service.ts";
import type { ResultadoRodadaColeta } from "./collections.types.ts";

test("TP07 grava serviços e coletas com os repositories reais da BD04", async (t) => {
  const schema = `tp07_${randomUUID().replaceAll("-", "")}`;
  const pools = new Set<pg.Pool>();
  const conectar = pg.Pool.prototype.connect;
  // Mantém o comportamento real; só registra os pools para encerrá-los no teste.
  t.mock.method(pg.Pool.prototype, "connect", function (this: pg.Pool, ...args: unknown[]) {
    pools.add(this);
    return Reflect.apply(conectar, this, args);
  });
  const administrador = new pg.Pool({ connectionTimeoutMillis: 5000 });
  await administrador.query(`CREATE SCHEMA "${schema}"`);
  const banco = new pg.Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
  const anteriores = [
    process.env.PGOPTIONS,
    process.env.METRICS_API_URL,
    process.env.CARBON_API_URL,
    process.env.API_TIMEOUT_MS,
  ];
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  t.after(async () => {
    for (const pool of pools) if (pool !== administrador) await pool.end();
    await administrador.query(`DROP SCHEMA "${schema}" CASCADE`);
    await administrador.end();
    ["PGOPTIONS", "METRICS_API_URL", "CARBON_API_URL", "API_TIMEOUT_MS"].forEach((chave, i) => {
      if (anteriores[i] === undefined) delete process.env[chave];
      else process.env[chave] = anteriores[i];
    });
  });
  await banco.query(
    await readFile(new URL("../../../../database/schema.sql", import.meta.url), "utf8"),
  );
  await banco.query(
    await readFile(new URL("../../../../database/seed.sql", import.meta.url), "utf8"),
  );
  // As regiões fictícias são pré-configuradas com metadados completos, como exige o schema.
  for (const regiao of regioes) {
    await banco.query(
      "INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia, fonte) VALUES ($1, $2, $3, 2026, 'mock TP07')",
      [regiao.region, regiao.country, regiao.carbon_intensity_gco2e_per_kwh],
    );
  }
  const { tratarRequisicao } = await import("../../app.ts");
  const { buscarHistoricoColetas } = await import("./collections.repository.ts");
  let cadastro = structuredClone(servicos);
  const chamadasMetricas = new Map<string, number>();
  let bloquearMetrica: (() => Promise<void>) | undefined;
  const estado = {
    semCarbono: false,
    falharPrimeiroCarbono: false,
    indisponivel: false,
    zerarMetricas: false,
    intervaloZero: false,
    intervaloApi: 60,
    cpuPercentual: 25,
    falhaListagem: "",
    falhaPrimeiroServico: "" as "" | "http" | "timeout" | "rede" | "sem_metricas",
  };
  const mock = createServer(async (request, response) => {
    const caminho = new URL(request.url!, "http://localhost").pathname;
    if (caminho.startsWith("/metrics/")) {
      chamadasMetricas.set(caminho, (chamadasMetricas.get(caminho) ?? 0) + 1);
      if (caminho === "/metrics/servico-1" && bloquearMetrica) {
        const bloquear = bloquearMetrica;
        bloquearMetrica = undefined;
        await bloquear();
      }
    }
    if (caminho === "/metrics/servico-1" && estado.falhaPrimeiroServico) {
      if (estado.falhaPrimeiroServico === "rede") request.socket.destroy();
      else if (estado.falhaPrimeiroServico !== "timeout") {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({
          error: estado.falhaPrimeiroServico === "sem_metricas" ? "metrics_missing" : "service_unavailable",
          message: "Métricas indisponíveis",
        }));
      }
      return;
    }
    if (
      (estado.semCarbono && caminho.includes("/regions/")) ||
      (estado.falharPrimeiroCarbono && caminho.includes("/regions/BR-SP/"))
    ) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unavailable", message: "Carbono indisponível" }));
    } else if (caminho.startsWith("/metrics/")) {
      response.writeHead(estado.indisponivel ? 503 : 200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          estado.indisponivel
            ? { error: "service_unavailable", message: "Serviço indisponível" }
            : estado.intervaloZero
              ? { ...metricas, collection_interval_seconds: 0 }
              : estado.zerarMetricas
                ? {
                    collection_interval_seconds: 60,
                    metrics: { cpu_percent: 0, memory_gb: 0, disk_gb: 0, network_gb: 0 },
                  }
                : {
                    ...metricas,
                    collection_interval_seconds: estado.intervaloApi,
                    metrics: { ...metricas.metrics, cpu_percent: estado.cpuPercentual },
                  },
        ),
      );
    } else if (caminho === "/services") {
      if (estado.falhaListagem === "timeout") return;
      if (estado.falhaListagem === "rede") { request.socket.destroy(); return; }
      if (estado.falhaListagem === "http") {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "unavailable", message: "Catálogo indisponível" }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(estado.falhaListagem === "json" ? "{" : JSON.stringify(cadastro));
    } else {
      tratarRequisicaoMock(request, response);
    }
  });
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  t.after(() => {
    for (const app of [mock, servidor]) {
      app.close();
      app.closeAllConnections();
    }
  });
  await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", resolve));
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const enderecoMock = mock.address();
  const enderecoApi = servidor.address();
  assert.ok(enderecoMock && typeof enderecoMock !== "string");
  assert.ok(enderecoApi && typeof enderecoApi !== "string");
  process.env.METRICS_API_URL = `http://127.0.0.1:${enderecoMock.port}`;
  process.env.CARBON_API_URL = process.env.METRICS_API_URL;
  const urlApi = `http://127.0.0.1:${enderecoApi.port}`;
  const executar = () => fetch(`${urlApi}/collections/executar`, { method: "POST" });
  let idServico: number;

  await t.test("rodada confirma serviços e métricas com suas chaves estrangeiras", async () => {
    const resposta = await executar();
    assert.equal(resposta.status, 200, await resposta.clone().text());
    const dados = (await resposta.json()) as { dados: { sucessos: number } };
    assert.equal(dados.dados.sucessos, 2);
    const registro = await banco.query("SELECT id::int FROM servicos WHERE id_externo = $1", [
      servicos[0].id,
    ]);
    idServico = registro.rows[0].id;
    const [coleta] = await buscarHistoricoColetas(idServico);
    assert.equal(coleta.cpuPercentual, metricas.metrics.cpu_percent);
    assert.equal(coleta.memoriaGb, metricas.metrics.memory_gb);
    assert.equal(coleta.intervaloSegundos, metricas.collection_interval_seconds);
    assert.ok(coleta.energiaKwh! > 0);
    const lista = await fetch(`${urlApi}/services`);
    assert.equal(lista.status, 200);
    assert.ok(((await lista.json()) as { id: number }[]).some((s) => s.id === idServico));
    const regiao = await banco.query(
      "SELECT r.fator_co2e_g_kwh, r.ano_referencia FROM regioes r JOIN servicos s ON s.regiao_id = r.id WHERE s.id = $1",
      [idServico],
    );
    assert.deepEqual(regiao.rows[0], { fator_co2e_g_kwh: "100.0000", ano_referencia: 2026 });
  });

  await t.test(
    "nova rodada atualiza pelo ID externo, acrescenta histórico e recupera o serviço indisponível",
    async () => {
      await banco.query("UPDATE servicos SET status = 'indisponivel' WHERE id = $1", [idServico]);
      await banco.query(
        "UPDATE regioes SET fator_co2e_g_kwh = 99.1234, ano_referencia = 2020, fonte = 'Referência cadastrada' WHERE id = (SELECT regiao_id FROM servicos WHERE id = $1)",
        [idServico],
      );
      cadastro[0].name = "Serviço atualizado '";
      cadastro[0].location.city = "Outra cidade";
      assert.equal((await executar()).status, 200);
      const registros = await banco.query(
        "SELECT id::int, nome, cidade, status FROM servicos WHERE id_externo = $1",
        [servicos[0].id],
      );
      assert.equal(registros.rowCount, 1);
      assert.deepEqual(registros.rows[0], {
        id: idServico,
        nome: cadastro[0].name,
        cidade: "Outra cidade",
        status: "ativo",
      });
      assert.equal((await buscarHistoricoColetas(idServico)).length, 2);
      const regiao = await banco.query(
        "SELECT r.fator_co2e_g_kwh::float8 AS fator, r.ano_referencia, r.fonte FROM regioes r JOIN servicos s ON s.regiao_id = r.id WHERE s.id = $1",
        [idServico],
      );
      assert.deepEqual(regiao.rows[0], {
        fator: 99.1234,
        ano_referencia: 2020,
        fonte: "Referência cadastrada",
      });
    },
  );

  await t.test(
    "falha de carbono em uma região preserva as métricas e não bloqueia os demais serviços",
    async () => {
      estado.falharPrimeiroCarbono = true;
      const resposta = await executar();
      estado.falharPrimeiroCarbono = false;
      assert.equal(resposta.status, 200);
      const resultado = (await resposta.json()) as { sucesso: boolean; resultado: string; dados: { sucessos: number; parciais: number; erros: number } };
      assert.equal(resultado.sucesso, false);
      assert.equal(resultado.resultado, "parcial");
      assert.equal(resultado.dados.sucessos, 1);
      assert.equal(resultado.dados.parciais, 1);
      assert.equal(resultado.dados.erros, 1);
      const [coleta] = await buscarHistoricoColetas(idServico);
      assert.equal(coleta.cpuPercentual, metricas.metrics.cpu_percent);
      assert.equal(coleta.energiaKwh, null);
      assert.equal(coleta.calculadoEm, null);
      const outro = await banco.query("SELECT id::int FROM servicos WHERE id_externo = $1", [
        servicos[1].id,
      ]);
      const [outraColeta] = await buscarHistoricoColetas(outro.rows[0].id);
      assert.ok(outraColeta.energiaKwh! > 0);
      assert.ok(outraColeta.calculadoEm instanceof Date);
    },
  );

  await t.test(
    "serviço sem localização é gravado com campos nulos e guarda as métricas sem calcular CO₂e",
    async () => {
      const anterior = cadastro;
      cadastro = [
        { ...structuredClone(servicos[0]), id: "servico-sem-localizacao", location: null } as never,
      ];
      const resposta = await executar();
      cadastro = anterior;
      assert.equal(resposta.status, 200);
      const registros = await banco.query(
        `SELECT id::int, regiao_id, cidade, latitude, longitude
         FROM servicos WHERE id_externo = $1`,
        ["servico-sem-localizacao"],
      );
      assert.equal(registros.rowCount, 1);
      assert.deepEqual(
        { ...registros.rows[0], id: undefined },
        { id: undefined, regiao_id: null, cidade: null, latitude: null, longitude: null },
      );
      const [coleta] = await buscarHistoricoColetas(registros.rows[0].id);
      assert.equal(coleta.statusColeta, "sucesso");
      assert.equal(coleta.cpuPercentual, metricas.metrics.cpu_percent);
      assert.equal(coleta.energiaKwh, null);
      assert.equal(coleta.calculadoEm, null);
    },
  );

  await t.test(
    "região não cadastrada gera erro sem inventar fatores nem gravar serviço com FK inválida",
    async (t) => {
      t.mock.method(console, "error", () => {});
      const anterior = cadastro;
      cadastro = [{ ...structuredClone(servicos[0]), id: "servico-novo-sem-carbono" }];
      cadastro[0].location.region = "Região sem fator conhecido";
      estado.semCarbono = true;
      const resposta = await executar();
      cadastro = anterior;
      estado.semCarbono = false;
      assert.equal(resposta.status, 500);
      const registros = await banco.query(
        `SELECT s.id::int, r.fator_co2e_g_kwh, r.ano_referencia
       FROM servicos s JOIN regioes r ON r.id = s.regiao_id WHERE s.id_externo = $1`,
        ["servico-novo-sem-carbono"],
      );
      assert.equal(registros.rowCount, 0);
    },
  );

  await t.test(
    "tentativas indisponíveis são registradas sem métricas e sem data de cálculo",
    async () => {
      estado.indisponivel = true;
      assert.equal((await executar()).status, 200);
      estado.indisponivel = false;
      const [coleta] = await buscarHistoricoColetas(idServico);
      assert.equal(coleta.statusColeta, "indisponivel");
      assert.equal(coleta.cpuPercentual, null);
      assert.equal(coleta.calculadoEm, null);
    },
  );

  await t.test("métricas zeradas continuam presentes no histórico", async () => {
    estado.zerarMetricas = true;
    assert.equal((await executar()).status, 200);
    estado.zerarMetricas = false;
    const [coleta] = await buscarHistoricoColetas(idServico);
    assert.equal(coleta.statusColeta, "sucesso");
    assert.equal(coleta.cpuPercentual, 0);
    assert.equal(coleta.memoriaGb, 0);
    assert.ok(coleta.calculadoEm instanceof Date);
  });

  await t.test(
    "falha de um cadastro retorna HTTP 500 depois de confirmar as coletas dos outros serviços",
    async (t) => {
      t.mock.method(console, "error", () => {});
      const nomeAnterior = cadastro[0].name;
      cadastro[0].name = "x".repeat(121);
      const antes = await banco.query("SELECT count(*)::int AS total FROM metricas_servico");
      assert.equal((await executar()).status, 500);
      cadastro[0].name = nomeAnterior;
      const depois = await banco.query("SELECT count(*)::int AS total FROM metricas_servico");
      assert.equal(depois.rows[0].total, antes.rows[0].total + 1);
    },
  );

  await t.test("outra conexão recupera os serviços e todas as coletas confirmadas", async () => {
    const outraConexao = new pg.Pool({ options: `-c search_path=${schema}` });
    const resultado = await outraConexao.query(
      "SELECT s.id::int, count(m.id)::int AS coletas FROM servicos s JOIN metricas_servico m ON m.servico_id = s.id WHERE s.id_externo = $1 GROUP BY s.id",
      [servicos[0].id],
    );
    assert.deepEqual(resultado.rows, [{ id: idServico, coletas: 5 }]);
    const resposta = await fetch(`${urlApi}/collections`);
    assert.equal(resposta.status, 200);
    assert.equal(((await resposta.json()) as unknown[]).length, 12);
  });

  await t.test(
    "intervalo zero é gravado com as métricas, a duração e os resultados corretos",
    async () => {
      estado.intervaloZero = true;
      const resposta = await executar();
      estado.intervaloZero = false;
      assert.equal(resposta.status, 200);
      const [coleta] = await buscarHistoricoColetas(idServico);
      assert.equal(coleta.intervaloSegundos, 0);
      assert.equal(coleta.cpuPercentual, metricas.metrics.cpu_percent);
      assert.equal(coleta.duracaoSegundos, 0);
      assert.equal(coleta.energiaKwh, 0);
      assert.equal(coleta.emissaoCo2eG, 0);
      assert.ok(coleta.calculadoEm instanceof Date);
    },
  );

  await t.test(
    "coletas concorrentes reutilizam o serviço do seed pelo ID externo e acrescentam histórico",
    async () => {
      const original = cadastro;
      cadastro = [
        {
          ...structuredClone(servicos[0]),
          id: "billing-api",
          name: "Billing API",
          location: { ...servicos[0].location, region: "Sudeste" },
        },
      ];
      try {
        const antes = await banco.query(
          "SELECT id::int FROM servicos WHERE id_externo = 'billing-api'",
        );
        const idSeed = antes.rows[0].id;
        const quantidade = await banco.query("SELECT count(*)::int AS total FROM servicos");
        const historico = await buscarHistoricoColetas(idSeed);
        const respostas = await Promise.all([executar(), executar()]);
        for (const resposta of respostas) assert.equal(resposta.status, 200);
        const depois = await banco.query(
          "SELECT id::int FROM servicos WHERE id_externo = 'billing-api'",
        );
        assert.deepEqual(depois.rows, [{ id: idSeed }]);
        assert.deepEqual(
          (await banco.query("SELECT count(*)::int AS total FROM servicos")).rows,
          quantidade.rows,
        );
        assert.equal((await buscarHistoricoColetas(idSeed)).length, historico.length + 2);
      } finally {
        cadastro = original;
      }
    },
  );

  async function consultarEstadoAtual() {
    const lista = await fetch(`${urlApi}/services`);
    const indicadores = await fetch(`${urlApi}/dashboard/indicadores`);
    assert.equal(lista.status, 200);
    assert.equal(indicadores.status, 200);
    return {
      servicos: await lista.json() as ServicoComUltimaColeta[],
      indicadores: await indicadores.json() as IndicadoresDashboard,
    };
  }

  for (const tipo of ["http", "timeout", "rede"] as const) {
    await t.test(`${tipo} altera apenas o serviço afetado, preserva histórico e recupera contagem e listagem`, async (t) => {
      t.mock.method(console, "error", () => {});
      process.env.API_TIMEOUT_MS = "500";
      assert.equal((await executar()).status, 200);
      const antes = await consultarEstadoAtual();
      const historico = await buscarHistoricoColetas(idServico);
      estado.falhaPrimeiroServico = tipo;
      try {
        const inicio = Date.now();
        const resposta = await executar();
        assert.equal(resposta.status, 200);
        const corpo = await resposta.json() as { resultado: string; dados: ResultadoRodadaColeta };
        assert.equal(corpo.resultado, "parcial");
        assert.equal(corpo.dados.sucessos, 1);
        assert.equal(corpo.dados.indisponiveis, 1);
        assert.equal(corpo.dados.detalhes.find((d) => d.servicoId === idServico)!.falha?.tipo, tipo);
        const atual = await consultarEstadoAtual();
        assert.equal(atual.indicadores.servicos_indisponiveis, antes.indicadores.servicos_indisponiveis + 1);
        assert.equal(atual.indicadores.servicos_ativos, antes.indicadores.servicos_ativos - 1);
        const servico = atual.servicos.find((s) => s.id === idServico)!;
        assert.equal(servico.status, "indisponivel");
        assert.equal(servico.statusColeta, "indisponivel");
        assert.equal(servico.cpuPercentual, null);
        assert.equal(servico.energiaKwh, null);
        const coletas = await buscarHistoricoColetas(idServico);
        assert.equal(coletas.length, historico.length + 1);
        assert.deepEqual(coletas.slice(1), historico);
        const [falha] = coletas;
        assert.ok(falha.coletadoEm.getTime() >= inicio && falha.coletadoEm.getTime() <= Date.now());
        assert.equal(falha.statusColeta, "indisponivel");
        assert.equal(falha.intervaloSegundos, 60);
        for (const campo of ["cpuPercentual", "memoriaGb", "discoGb", "redeGb", "potenciaEstimadaW", "duracaoSegundos", "energiaKwh", "emissaoCo2eG", "calculadoEm"] as const) {
          assert.equal(falha[campo], null);
        }
        const outroId = corpo.dados.detalhes.find((d) => d.servicoId !== idServico)!.servicoId;
        assert.equal(atual.servicos.find((s) => s.id === outroId)!.statusColeta, "sucesso");
        assert.equal((await fetch(`${urlApi}/health/live`)).status, 200);
        estado.falhaPrimeiroServico = "";
        assert.equal((await executar()).status, 200);
        const recuperado = await consultarEstadoAtual();
        assert.equal(recuperado.indicadores.servicos_indisponiveis, antes.indicadores.servicos_indisponiveis);
        assert.equal(recuperado.servicos.find((s) => s.id === idServico)!.status, "ativo");
        assert.equal(recuperado.servicos.find((s) => s.id === idServico)!.statusColeta, "sucesso");
        const recuperacao = await buscarHistoricoColetas(idServico);
        assert.equal(recuperacao.length, historico.length + 2);
        assert.deepEqual(recuperacao.slice(1), coletas);
      } finally {
        estado.falhaPrimeiroServico = "";
      }
    });
  }

  await t.test("metrics_missing recupera o cadastro como ativo sem métricas e preserva os campos nulos", async (t) => {
    t.mock.method(console, "error", () => {});
    const antes = await consultarEstadoAtual();
    estado.falhaPrimeiroServico = "http";
    await executar();
    estado.falhaPrimeiroServico = "sem_metricas";
    try {
      const resposta = await executar();
      const corpo = await resposta.json() as { dados: ResultadoRodadaColeta };
      assert.equal(corpo.dados.semMetricas, 1);
      assert.equal(corpo.dados.indisponiveis, 0);
      const atual = await consultarEstadoAtual();
      assert.equal(atual.indicadores.servicos_indisponiveis, antes.indicadores.servicos_indisponiveis);
      const servico = atual.servicos.find((s) => s.id === idServico)!;
      assert.equal(servico.status, "ativo");
      assert.equal(servico.statusColeta, "sem_metricas");
      const [coleta] = await buscarHistoricoColetas(idServico);
      assert.equal(coleta.cpuPercentual, null);
      assert.equal(coleta.energiaKwh, null);
      assert.equal(coleta.calculadoEm, null);
    } finally {
      estado.falhaPrimeiroServico = "";
    }
  });

  await t.test("gravação de coleta não reativa nem substitui o estado removido", async (t) => {
    t.mock.method(console, "error", () => {});
    const { gravarColeta } = await import("./collections.repository.ts");
    await banco.query("UPDATE servicos SET status = 'removido' WHERE id = $1", [idServico]);
    try {
      for (const statusColeta of ["indisponivel", "sem_metricas", "sucesso"] as const) {
        await gravarColeta({
          servicoId: idServico, statusColeta, intervaloSegundos: 60,
          cpuPercentual: null, memoriaGb: null, discoGb: null, redeGb: null,
          potenciaEstimadaW: null, duracaoSegundos: null, energiaKwh: null, emissaoCo2eG: null,
        });
        const atual = await consultarEstadoAtual();
        assert.equal(atual.servicos.find((s) => s.id === idServico)!.status, "removido");
      }
    } finally {
      estado.falhaPrimeiroServico = "";
      await banco.query("UPDATE servicos SET status = 'ativo' WHERE id = $1", [idServico]);
    }
  });

  await t.test("falha ao atualizar o estado não confirma uma amostra isolada do cadastro", async (t) => {
    t.mock.method(console, "error", () => {});
    const historico = await buscarHistoricoColetas(idServico);
    await banco.query("ALTER TABLE servicos ADD CONSTRAINT teste_estado CHECK (status <> 'indisponivel') NOT VALID");
    estado.falhaPrimeiroServico = "http";
    try {
      assert.equal((await executar()).status, 500);
      assert.deepEqual(await buscarHistoricoColetas(idServico), historico);
      assert.equal((await consultarEstadoAtual()).servicos.find((s) => s.id === idServico)!.status, "ativo");
    } finally {
      estado.falhaPrimeiroServico = "";
      await banco.query("ALTER TABLE servicos DROP CONSTRAINT teste_estado");
    }
  });

  await t.test("TP06 duas coletas automáticas preservam estados diferentes no PostgreSQL", async (t) => {
    const { listarServicos } = await import("../../integrations/metrics-api.ts");
    const { coletarServico, buscarIntervaloAlternativo } = await import("./collections.service.ts");
    const rotina = criarRotinaColeta({
      listarServicos, coletarServico, buscarIntervaloAlternativo,
      logger: { log() {}, warn() {}, error() {} },
    });
    t.after(() => rotina.parar());
    estado.intervaloApi = 1;
    const antes = await buscarHistoricoColetas(idServico);
    async function aguardarQuantidade(quantidade: number) {
      const limite = Date.now() + 5000;
      while (Date.now() < limite) {
        const historico = await buscarHistoricoColetas(idServico);
        if (historico.length >= quantidade) return historico;
        await setTimeout(20);
      }
      throw new Error("A rotina não persistiu a coleta no prazo esperado");
    }
    rotina.iniciar();
    const [primeira] = await aguardarQuantidade(antes.length + 1);
    estado.cpuPercentual = 40;
    const [segunda] = await aguardarQuantidade(antes.length + 2);
    await rotina.parar();
    assert.equal(primeira.cpuPercentual, 25);
    assert.equal(segunda.cpuPercentual, 40);
    assert.notEqual(segunda.id, primeira.id);
    assert.ok(segunda.coletadoEm > primeira.coletadoEm);
    const historico = await buscarHistoricoColetas(idServico);
    assert.deepEqual(historico.find((coleta) => coleta.id === primeira.id), primeira);
    const cadastroSalvo = await banco.query("SELECT id::int FROM servicos WHERE id_externo = $1", [servicos[0].id]);
    assert.deepEqual(cadastroSalvo.rows, [{ id: idServico }]);
    const lista = (await (await fetch(`${urlApi}/collections`)).json()) as { id: number }[];
    assert.ok(lista.some((coleta) => coleta.id === primeira.id));
    assert.ok(lista.some((coleta) => coleta.id === segunda.id));
  });

  await t.test("mock sem-metricas publica ausência, preserva histórico e recupera no mesmo processo", async () => {
    const urlOriginal = process.env.METRICS_API_URL;
    const antes = await buscarHistoricoColetas(idServico);
    const quantidadeServicos = await banco.query("SELECT count(*)::int AS total FROM servicos");
    await banco.query("UPDATE servicos SET status = 'indisponivel' WHERE id = $1", [idServico]);
    try {
      process.env.METRICS_API_URL = `${urlOriginal}/cenarios/sem-metricas`;
      const resposta = await executar();
      assert.equal(resposta.status, 200);
      const corpo = await resposta.json() as {
        sucesso: boolean; resultado: string;
        dados: { totalServicos: number; sucessos: number; parciais: number; semMetricas: number; indisponiveis: number; erros: number };
      };
      assert.equal(corpo.sucesso, false);
      assert.equal(corpo.resultado, "parcial");
      assert.equal(corpo.dados.totalServicos, 2);
      assert.equal(corpo.dados.semMetricas, 2);
      assert.equal(corpo.dados.indisponiveis, 0);
      assert.equal(corpo.dados.erros, 0);
      assert.equal(corpo.dados.sucessos, 0);
      assert.equal(corpo.dados.parciais, 0);

      const [ausencia, ...historico] = await buscarHistoricoColetas(idServico);
      assert.equal(ausencia.statusColeta, "sem_metricas");
      assert.equal(ausencia.intervaloSegundos, 60);
      assert.ok([
        ausencia.cpuPercentual, ausencia.memoriaGb, ausencia.discoGb, ausencia.redeGb,
        ausencia.potenciaEstimadaW, ausencia.duracaoSegundos, ausencia.energiaKwh,
        ausencia.emissaoCo2eG, ausencia.calculadoEm,
      ].every((valor) => valor === null));
      assert.deepEqual(historico, antes);
      const servicosPublicados = await (await fetch(`${urlApi}/services`)).json() as Record<string, unknown>[];
      const publicado = servicosPublicados.find((servico) => servico.id === idServico);
      assert.ok(publicado);
      assert.equal(publicado.status, "ativo");
      assert.equal(publicado.statusColeta, "sem_metricas");
      assert.equal(publicado.coletadoEm, ausencia.coletadoEm.toISOString());
      for (const campo of ["cpuPercentual", "memoriaGb", "discoGb", "redeGb", "energiaKwh", "emissaoCo2eG"]) {
        assert.equal(publicado[campo], null);
      }
      const semLocalizacao = servicosPublicados.find((servico) => servico.nome === servicos[0].name && servico.pais === null);
      assert.ok(semLocalizacao, "a listagem mantém serviços sem localização");
      const respostaHistorico = await fetch(`${urlApi}/collections?serviceId=${idServico}`);
      assert.equal(respostaHistorico.status, 200);
      const historicoPublicado = await respostaHistorico.json() as Record<string, unknown>[];
      assert.equal(historicoPublicado[0].id, ausencia.id);
      assert.equal(historicoPublicado[0].statusColeta, "sem_metricas");

      assert.equal((await executar()).status, 200);
      const [segundaAusencia, primeiraAusencia] = await buscarHistoricoColetas(idServico);
      assert.equal(segundaAusencia.statusColeta, "sem_metricas");
      assert.notEqual(segundaAusencia.id, ausencia.id);
      assert.deepEqual(primeiraAusencia, ausencia);
      assert.deepEqual((await banco.query("SELECT count(*)::int AS total FROM servicos")).rows, quantidadeServicos.rows);

      process.env.METRICS_API_URL = urlOriginal;
      estado.intervaloApi = 60;
      estado.cpuPercentual = 40;
      const recuperacao = await (await executar()).json() as { dados: { sucessos: number } };
      assert.equal(recuperacao.dados.sucessos, 2);
      const [recuperada, ...anteriores] = await buscarHistoricoColetas(idServico);
      assert.equal(recuperada.statusColeta, "sucesso");
      assert.equal(recuperada.cpuPercentual, 40);
      assert.ok(recuperada.energiaKwh! > 0);
      assert.deepEqual(anteriores, [segundaAusencia, ausencia, ...antes]);
      const atualizados = await (await fetch(`${urlApi}/services`)).json() as Record<string, unknown>[];
      assert.equal(atualizados.find((servico) => servico.id === idServico)?.statusColeta, "sucesso");
      const status = await (await fetch(`${urlApi}/collections/rotina/status`)).json() as {
        dados: { monitoramento: { situacao: string; falhasAtivas: unknown[] } };
      };
      assert.equal(status.dados.monitoramento.situacao, "ok");
      assert.deepEqual(status.dados.monitoramento.falhasAtivas, []);
    } finally {
      if (urlOriginal === undefined) delete process.env.METRICS_API_URL;
      else process.env.METRICS_API_URL = urlOriginal;
    }
  });

  const { rotinaColeta, executarRodadaColeta } = await import("./collections.service.ts");
  const { sincronizarPresencaServicos } = await import("../services/services.repository.ts");
  const aplicacaoId = (await banco.query("SELECT id::int FROM aplicacoes WHERE nome = 'GreenER Demo'")).rows[0].id;
  const eventos = async () => (await banco.query<{
    acao: string; detalhes: { idExterno: string; servicoId: number; statusAnterior: string | null; statusNovo: string };
    criado_em: Date;
  }>("SELECT acao, detalhes, criado_em FROM logs_sistema WHERE detalhes->>'idExterno' IN ('servico-1', 'servico-2') ORDER BY id")).rows;
  const estadoServico = async (id = idServico) => (await banco.query(
    "SELECT id::int, id_externo, status, criado_em FROM servicos WHERE id = $1", [id],
  )).rows[0];
  async function aguardar(condicao: () => Promise<boolean>) {
    const limite = Date.now() + 6000;
    while (!(await condicao())) {
      assert.ok(Date.now() < limite, "A mudança não foi persistida no prazo esperado");
      await setTimeout(20);
    }
  }

  await t.test("catálogo muda ao vivo: inclui, remove e reativa preservando identidade e histórico", async (t) => {
    t.mock.method(console, "log", () => {});
    t.mock.method(console, "warn", () => {});
    const original = cadastro;
    const novo = { ...structuredClone(servicos[1]), id: "servico-adicionado", name: "Serviço adicionado" };
    cadastro = [structuredClone(servicos[0])];
    estado.intervaloApi = 1;
    const antes = await estadoServico();
    const historicoAntes = await buscarHistoricoColetas(idServico);
    let idNovo: number | undefined;
    try {
      assert.equal(rotinaColeta.iniciar(1), true);
      assert.equal(rotinaColeta.iniciar(1), false);
      await aguardar(async () => (await buscarHistoricoColetas(idServico)).length > historicoAntes.length);
      cadastro = [cadastro[0], novo];
      await aguardar(async () => {
        const registro = await banco.query("SELECT id::int FROM servicos WHERE id_externo = $1", [novo.id]);
        idNovo = registro.rows[0]?.id;
        return idNovo !== undefined && (await buscarHistoricoColetas(idNovo)).length > 0;
      });
      assert.equal((await banco.query("SELECT count(*)::int AS total FROM logs_sistema WHERE acao = 'servico_incluido' AND detalhes->>'idExterno' = $1", [novo.id])).rows[0].total, 1);
      const historicoNovo = await buscarHistoricoColetas(idNovo!);
      const eventosAntes = (await eventos()).length;
      cadastro = [novo];
      await aguardar(async () => (await estadoServico()).status === "removido");
      await aguardar(async () => rotinaColeta.status().coletasEmAndamento === 0);
      const historicoRemovido = await buscarHistoricoColetas(idServico);
      const chamadasRemovido = chamadasMetricas.get("/metrics/servico-1");
      assert.deepEqual(historicoRemovido.filter((coleta) => historicoAntes.some((anterior) => anterior.id === coleta.id)), historicoAntes);
      const aposRemocao = await eventos();
      assert.equal(aposRemocao.length, eventosAntes + 1);
      assert.equal(aposRemocao.at(-1)?.acao, "servico_removido");
      await aguardar(async () => (await buscarHistoricoColetas(idNovo!)).length > historicoNovo.length + 1);
      assert.equal(chamadasMetricas.get("/metrics/servico-1"), chamadasRemovido);
      assert.deepEqual(await buscarHistoricoColetas(idServico), historicoRemovido);
      assert.deepEqual(await eventos(), aposRemocao);
      cadastro = [structuredClone(servicos[0]), novo];
      await aguardar(async () => (await buscarHistoricoColetas(idServico)).length > historicoRemovido.length);
      const depois = await estadoServico();
      assert.equal(depois.id, antes.id);
      assert.deepEqual(depois.criado_em, antes.criado_em);
      assert.equal(depois.status, "ativo");
      assert.deepEqual((await buscarHistoricoColetas(idServico)).filter((coleta) => historicoRemovido.some((anterior) => anterior.id === coleta.id)), historicoRemovido);
      const aposRetorno = await eventos();
      assert.equal(aposRetorno.at(-1)?.acao, "servico_reativado");
      assert.deepEqual(aposRetorno.at(-1)?.detalhes.statusAnterior, "removido");
      assert.ok(aposRetorno.every((evento) => evento.criado_em instanceof Date));
      assert.equal(rotinaColeta.status().executando, true);
      await executarRodadaColeta();
      assert.deepEqual(await eventos(), aposRetorno);
    } finally {
      await rotinaColeta.parar();
      cadastro = original;
      estado.intervaloApi = 60;
    }
  });

  await t.test("listas inválidas e falhas externas preservam estados e eventos", async (t) => {
    t.mock.method(console, "error", () => {});
    assert.equal((await executar()).status, 200);
    const original = cadastro;
    const timeoutAnterior = process.env.API_TIMEOUT_MS;
    const antes = await estadoServico();
    const registros = await eventos();
    try {
      for (const modo of ["http", "timeout", "rede", "json"]) {
        estado.falhaListagem = modo;
        process.env.API_TIMEOUT_MS = "100";
        assert.equal((await executar()).status, modo === "timeout" ? 504 : 502);
        assert.deepEqual(await estadoServico(), antes);
        assert.deepEqual(await eventos(), registros);
      }
      estado.falhaListagem = "";
      for (const lista of [
        [original[0], original[0]],
        [{ ...original[0], id: " " }],
        [{ ...original[0], id: "x".repeat(101) }],
        [original[0], {}],
      ]) {
        cadastro = lista as typeof cadastro;
        assert.equal((await executar()).status, 502);
        assert.deepEqual(await estadoServico(), antes);
        assert.deepEqual(await eventos(), registros);
      }
    } finally {
      cadastro = original;
      estado.falhaListagem = "";
      if (timeoutAnterior === undefined) delete process.env.API_TIMEOUT_MS;
      else process.env.API_TIMEOUT_MS = timeoutAnterior;
    }
    assert.equal((await executar()).status, 200);
  });

  await t.test("lista vazia remove uma vez e reaparecimento após ausência reativa o mesmo serviço", async () => {
    const original = cadastro;
    const antes = await buscarHistoricoColetas(idServico);
    const registrosAntes = (await eventos()).length;
    try {
      await banco.query("UPDATE servicos SET status = 'indisponivel' WHERE id = $1", [idServico]);
      cadastro = [];
      assert.equal((await executar()).status, 200);
      assert.equal((await estadoServico()).status, "removido");
      assert.deepEqual(await buscarHistoricoColetas(idServico), antes);
      const removidos = await eventos();
      assert.ok(removidos.length > registrosAntes);
      assert.equal(removidos.filter((evento) => evento.detalhes.idExterno === "servico-1").at(-1)?.detalhes.statusAnterior, "indisponivel");
      assert.equal((await executar()).status, 200);
      assert.deepEqual(await eventos(), removidos);
    } finally { cadastro = original; }
    assert.equal((await executar()).status, 200);
    assert.equal((await estadoServico()).id, idServico);
    assert.equal((await estadoServico()).status, "ativo");
    assert.ok((await buscarHistoricoColetas(idServico)).length > antes.length);
  });

  await t.test("transições e inclusões são desfeitas quando o evento não pode ser gravado", async (t) => {
    t.mock.method(console, "error", () => {});
    const original = cadastro;
    const antes = await estadoServico();
    const registros = await eventos();
    await banco.query("ALTER TABLE logs_sistema ADD CONSTRAINT teste_evento CHECK (acao NOT IN ('servico_removido', 'servico_reativado', 'servico_incluido')) NOT VALID");
    try {
      cadastro = [];
      assert.equal((await executar()).status, 500);
      assert.deepEqual(await estadoServico(), antes);
      assert.deepEqual(await eventos(), registros);
      await banco.query("UPDATE servicos SET status = 'removido' WHERE id = $1", [idServico]);
      cadastro = original;
      assert.equal((await executar()).status, 500);
      assert.equal((await estadoServico()).status, "removido");
      await banco.query("UPDATE servicos SET status = 'ativo' WHERE id = $1", [idServico]);
      cadastro = [...original, { ...structuredClone(servicos[0]), id: "inclusao-sem-evento" }];
      assert.equal((await executar()).status, 500);
      assert.equal((await banco.query("SELECT id FROM servicos WHERE id_externo = 'inclusao-sem-evento'")).rowCount, 0);
    } finally {
      cadastro = original;
      await banco.query("ALTER TABLE logs_sistema DROP CONSTRAINT teste_evento");
      await banco.query("UPDATE servicos SET status = 'ativo' WHERE id = $1", [idServico]);
    }
    assert.equal((await executar()).status, 200);
  });

  await t.test("sincronizações concorrentes e mudanças de nome não duplicam eventos de presença", async () => {
    const ids = cadastro.map((servico) => servico.id);
    const antes = (await eventos()).length;
    await Promise.all(Array.from({ length: 3 }, () =>
      sincronizarPresencaServicos(aplicacaoId, ids.filter((id) => id !== "servico-1")),
    ));
    assert.equal((await eventos()).length, antes + 1);
    await Promise.all(Array.from({ length: 3 }, () => sincronizarPresencaServicos(aplicacaoId, ids)));
    const depois = await eventos();
    assert.equal(depois.length, antes + 2);
    const original = cadastro;
    try {
      cadastro = [...cadastro].reverse().map((servico) => ({ ...servico, name: "Nome compartilhado" }));
      assert.equal((await executar()).status, 200);
      assert.deepEqual(await eventos(), depois);
      assert.equal((await banco.query("SELECT count(*)::int AS total FROM servicos WHERE id_externo IN ('servico-1', 'servico-2')")).rows[0].total, 2);
    } finally { cadastro = original; }
  });

  await t.test("sincronização preserva legados, outras aplicações e não aceita conflito de identidade", async () => {
    const outra = (await banco.query("INSERT INTO aplicacoes (nome) VALUES ('Outra aplicação monitorada') RETURNING id::int")).rows[0].id;
    const legado = (await banco.query("INSERT INTO servicos (aplicacao_id, nome) VALUES ($1, 'Cadastro legado') RETURNING id::int", [aplicacaoId])).rows[0].id;
    const externo = (await banco.query("INSERT INTO servicos (aplicacao_id, id_externo, nome) VALUES ($1, 'outra-aplicacao', 'Outro serviço') RETURNING id::int", [outra])).rows[0].id;
    const antes = await estadoServico();
    const registros = await eventos();
    await assert.rejects(sincronizarPresencaServicos(aplicacaoId, ["outra-aplicacao"]), /outra aplicação/);
    assert.deepEqual(await estadoServico(), antes);
    assert.deepEqual(await eventos(), registros);
    await sincronizarPresencaServicos(aplicacaoId, cadastro.map((servico) => servico.id));
    assert.equal((await estadoServico(legado)).status, "ativo");
    assert.equal((await estadoServico(externo)).status, "ativo");
  });

  await t.test("remoção concorrente cancela coletas antigas na fila sem reativar pela amostra pendente", async (t) => {
    t.mock.method(console, "error", () => {});
    const original = cadastro;
    let liberar!: () => void;
    let metricaIniciada = false;
    const bloqueio = new Promise<void>((resolve) => { liberar = resolve; });
    bloquearMetrica = async () => { metricaIniciada = true; await bloqueio; };
    const primeira = executarRodadaColeta();
    let segunda: Promise<ResultadoRodadaColeta> | undefined;
    try {
      await aguardar(async () => metricaIniciada);
      const contarCadastros = (await eventos()).length;
      const consulta = pg.Pool.prototype.query;
      let cadastroNaFila = false;
      t.mock.method(pg.Pool.prototype, "query", function (this: pg.Pool, ...args: unknown[]) {
        const resultado = Reflect.apply(consulta, this, args) as Promise<unknown>;
        if (String(args[0]).includes("WITH inserido AS") && (args[1] as unknown[])[0] === "servico-1") {
          return resultado.then((valor) => { cadastroNaFila = true; return valor; });
        }
        return resultado;
      });
      segunda = executarRodadaColeta();
      await aguardar(async () => cadastroNaFila);
      await setTimeout(0);
      cadastro = original.filter((servico) => servico.id !== "servico-1");
      await executarRodadaColeta();
      assert.equal((await estadoServico()).status, "removido");
      const chamadas = chamadasMetricas.get("/metrics/servico-1");
      liberar();
      await Promise.all([primeira, segunda]);
      assert.equal(chamadasMetricas.get("/metrics/servico-1"), chamadas);
      assert.equal((await estadoServico()).status, "removido");
      assert.equal((await eventos()).length, contarCadastros + 1);
    } finally {
      liberar();
      await Promise.allSettled([primeira, ...(segunda ? [segunda] : [])]);
      cadastro = original;
      bloquearMetrica = undefined;
    }
    assert.equal((await executar()).status, 200);
  });
});
