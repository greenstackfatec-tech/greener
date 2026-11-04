import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import pg from "pg";
import { tratarRequisicaoMock } from "../../mocks/app.ts";
import { metricas, regioes, servicos } from "../../mocks/fixtures.ts";

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
  ];
  process.env.PGOPTIONS = `-c search_path=${schema}`;
  t.after(async () => {
    for (const pool of pools) if (pool !== administrador) await pool.end();
    await administrador.query(`DROP SCHEMA "${schema}" CASCADE`);
    await administrador.end();
    ["PGOPTIONS", "METRICS_API_URL", "CARBON_API_URL"].forEach((chave, i) => {
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
  const estado = {
    semCarbono: false,
    falharPrimeiroCarbono: false,
    semMetricas: false,
    zerarMetricas: false,
    intervaloZero: false,
  };
  const mock = createServer((request, response) => {
    const caminho = new URL(request.url!, "http://localhost").pathname;
    if (
      (estado.semCarbono && caminho.includes("/regions/")) ||
      (estado.falharPrimeiroCarbono && caminho.includes("/regions/BR-SP/"))
    ) {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unavailable", message: "Carbono indisponível" }));
    } else if (caminho.startsWith("/metrics/")) {
      response.writeHead(estado.semMetricas ? 503 : 200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          estado.semMetricas
            ? { error: "service_unavailable", message: "Serviço indisponível" }
            : estado.intervaloZero
              ? { ...metricas, collection_interval_seconds: 0 }
              : estado.zerarMetricas
                ? {
                    collection_interval_seconds: 60,
                    metrics: { cpu_percent: 0, memory_gb: 0, disk_gb: 0, network_gb: 0 },
                  }
                : metricas,
        ),
      );
    } else if (caminho === "/services") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(cadastro));
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
    "nova rodada atualiza pelo ID externo, acrescenta histórico e preserva status para a TP11",
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
        status: "indisponivel",
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
      const resultado = (await resposta.json()) as { dados: { sucessos: number; erros: number } };
      assert.equal(resultado.dados.sucessos, 2);
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
      estado.semMetricas = true;
      assert.equal((await executar()).status, 200);
      estado.semMetricas = false;
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
    assert.equal(coleta.statusColeta, "sem_metricas");
    assert.equal(coleta.cpuPercentual, 0);
    assert.equal(coleta.memoriaGb, 0);
    assert.equal(coleta.calculadoEm, null);
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
    assert.equal(((await resposta.json()) as unknown[]).length, 11);
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
});
