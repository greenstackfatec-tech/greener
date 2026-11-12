// Configurar variáveis de ambiente ANTES de importar módulos que criam pools
process.env.PGHOST ??= "localhost";
process.env.PGPORT ??= "5432";
process.env.PGDATABASE ??= "greener";
process.env.PGUSER ??= "greener";
process.env.PGPASSWORD ??= "greener_dev_only";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";
import type { AgregacaoParams, HistoricoParams, RankingParams } from "./analytics.repository.ts";

const { Pool } = pg;

// Configuração de conexão para o banco de testes (localhost:5432 do docker-compose)
const dbConfig = {
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? "greener",
  user: process.env.PGUSER ?? "greener",
  password: process.env.PGPASSWORD ?? "greener_dev_only",
  connectionTimeoutMillis: 5000,
};

test("Módulo Analytics — consultas SQL com PostgreSQL real", async (t) => {
  // Isola cada execução em schema próprio
  const schema = `analytics_${randomUUID().replaceAll("-", "")}`;
  const administrador = new Pool({ ...dbConfig });
  const banco = new Pool({ ...dbConfig, options: `-c search_path=${schema}` });
  const opcoesAnteriores = process.env.PGOPTIONS;
  // O fuso da sessão difere de UTC para detectar dependência acidental do servidor.
  process.env.PGOPTIONS = `-c search_path=${schema} -c TimeZone=Pacific/Auckland`;
  let schemaCriado = false;
  let encerrarRepositorio: (() => Promise<void>) | undefined;
  t.after(async () => {
    try {
      await encerrarRepositorio?.();
    } finally {
      try {
        await banco.end();
        if (schemaCriado) await administrador.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        if (opcoesAnteriores === undefined) delete process.env.PGOPTIONS;
        else process.env.PGOPTIONS = opcoesAnteriores;
        await administrador.end();
      }
    }
  });

  // Cria schema no banco isolado
  await administrador.query(`CREATE SCHEMA "${schema}"`);
  schemaCriado = true;
  await banco.query(await readFile(new URL("../../../../database/schema.sql", import.meta.url), "utf8"));
  const {
    buscarHistoricoPorServico,
    buscarRankingPorPeriodo,
    compararServicosPorPeriodo,
    agregarMetricasPorPeriodo,
    encerrarPool,
  } = await import("./analytics.repository.ts");
  encerrarRepositorio = encerrarPool;

  // Dados de teste base
  const app = await banco.query("INSERT INTO aplicacoes (nome) VALUES ('App Teste') RETURNING id");
  const appId = app.rows[0].id;

  const regiaoSudeste = await banco.query(
    "INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia) VALUES ('Sudeste', 'Brazil', 85, 2026) RETURNING id"
  );
  const regiaoVirginia = await banco.query(
    "INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia) VALUES ('Virginia', 'United States', 378, 2026) RETURNING id"
  );
  const rSudesteId = regiaoSudeste.rows[0].id;
  const rVirginiaId = regiaoVirginia.rows[0].id;

  // 4 serviços: 2 no Sudeste, 2 em Virginia
  const servicos = await banco.query<{ id: string }>(
    `INSERT INTO servicos (aplicacao_id, regiao_id, nome, status) VALUES
       ($1, $2, 'Billing API', 'ativo'),
       ($1, $2, 'Email Dispatcher', 'ativo'),
       ($1, $3, 'Checkout Worker', 'ativo'),
       ($1, $3, 'Fraud Detector', 'indisponivel')
     RETURNING id`,
    [appId, rSudesteId, rVirginiaId],
  );
  const [s1, s2, s3, s4] = servicos.rows.map((s) => s.id); // s1,s2 = Sudeste; s3,s4 = Virginia

  // Coletas: s1 e s2 têm coletas bem-sucedidas; s3 tem uma; s4 é indisponível
  await banco.query(
    `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, cpu_percentual, memoria_gb, disco_gb, rede_gb, intervalo_segundos, energia_kwh, emissao_co2e_g) VALUES
       -- s1 (Sudeste): 2 coletas
       ($1, '2026-11-01T10:00:00Z', 'sucesso', 50, 2, 10, 1, 60, 0.1, 8.5),
       ($1, '2026-11-01T11:00:00Z', 'sucesso', 60, 3, 12, 2, 60, 0.2, 17.0),
       -- s2 (Sudeste): 1 coleta
       ($2, '2026-11-01T10:30:00Z', 'sucesso', 40, 1, 5, 0.5, 60, 0.05, 4.25),
       -- s3 (Virginia): 1 coleta
       ($3, '2026-11-01T10:00:00Z', 'sucesso', 70, 4, 20, 5, 60, 0.3, 113.4),
       -- s4 (indisponivel): sem coletas
       -- coletas sem_metricas e indisponivel não entram nas agregações
       ($1, '2026-11-01T12:00:00Z', 'sem_metricas', NULL, NULL, NULL, NULL, 60, NULL, NULL),
       ($3, '2026-11-01T12:00:00Z', 'indisponivel', NULL, NULL, NULL, NULL, 60, NULL, NULL)`,
    [s1, s2, s3],
  );

  const inicio = new Date("2026-11-01T00:00:00Z");
  const fim = new Date("2026-11-01T23:59:59Z");

  // ------------------------------------------------------------------
  // 1. Histórico por serviço
  // ------------------------------------------------------------------
  await t.test("buscarHistoricoPorServico retorna apenas coletas de sucesso ordenadas DESC", async () => {
    const hist = await buscarHistoricoPorServico({
      servicoId: Number(s1),
      inicio,
      fim,
      apenasSucesso: true,
    });
    assert.equal(hist.length, 2);
    assert.equal(hist[0].energiaKwh, 0.2); // mais recente primeiro
    assert.equal(hist[1].energiaKwh, 0.1);
  });

  await t.test("buscarHistoricoPorServico com apenasSucesso=false inclui sem_metricas e indisponivel", async () => {
    const hist = await buscarHistoricoPorServico({
      servicoId: Number(s1),
      inicio,
      fim,
      apenasSucesso: false,
    });
    assert.equal(hist.length, 3); // 2 sucesso + 1 sem_metricas
    const statuses = hist.map((h) => h.statusColeta).sort();
    assert.deepEqual(statuses, ["sem_metricas", "sucesso", "sucesso"]);
  });

  // ------------------------------------------------------------------
  // 2. Ranking — energia e CO₂e
  // ------------------------------------------------------------------
  await t.test("buscarRankingPorPeriodo metrica=energia ordena por totalEnergiaKwh DESC", async () => {
    const ranking = await buscarRankingPorPeriodo({
      inicio,
      fim,
      metrica: "energia",
      apenasAtivos: true,
    });
    // Apenas serviços ativos (s1, s2, s3). s4 é indisponível e deve ser excluído.
    assert.equal(ranking.length, 3);
    // s1 total energia = 0.3, s3 = 0.3, s2 = 0.05
    // Ordenação DESC por energia -> s1 e s3 empatados, s2 por último
    const nomes = ranking.map((r) => r.nome);
    assert.ok(nomes.includes("Billing API"));
    assert.ok(nomes.includes("Checkout Worker"));
    assert.ok(nomes.includes("Email Dispatcher"));
    // totalEnergiaKwh SEMPRE soma energia_kwh
    const s1Rank = ranking.find((r) => r.nome === "Billing API")!;
    assert.equal(s1Rank.totalEnergiaKwh, 0.3);
    assert.equal(s1Rank.totalEmissaoCo2eG, 25.5); // 8.5 + 17.0
  });

  await t.test("buscarRankingPorPeriodo metrica=co2e ordena por totalEmissaoCo2eG DESC", async () => {
    const ranking = await buscarRankingPorPeriodo({
      inicio,
      fim,
      metrica: "co2e",
      apenasAtivos: true,
    });
    assert.equal(ranking.length, 3);
    // s3 (Virginia) emissão = 113.4, s1 = 25.5, s2 = 4.25
    // Deve vir ordenado: Checkout Worker (113.4), Billing API (25.5), Email Dispatcher (4.25)
    assert.equal(ranking[0].nome, "Checkout Worker");
    assert.equal(ranking[1].nome, "Billing API");
    assert.equal(ranking[2].nome, "Email Dispatcher");
    // totalEnergiaKwh ainda soma energia_kwh
    const s3Rank = ranking.find((r) => r.nome === "Checkout Worker")!;
    assert.equal(s3Rank.totalEnergiaKwh, 0.3);
    assert.equal(s3Rank.totalEmissaoCo2eG, 113.4);
  });

  await t.test("buscarRankingPorPeriodo com filtro aplicacaoId", async () => {
    const ranking = await buscarRankingPorPeriodo({
      inicio,
      fim,
      metrica: "energia",
      aplicacaoId: Number(appId),
      apenasAtivos: true,
    });
    assert.equal(ranking.length, 3);
  });

  await t.test("buscarRankingPorPeriodo com filtro regiaoId", async () => {
    const ranking = await buscarRankingPorPeriodo({
      inicio,
      fim,
      metrica: "energia",
      regiaoId: Number(rSudesteId),
      apenasAtivos: true,
    });
    // Apenas s1 e s2 estão no Sudeste
    assert.equal(ranking.length, 2);
    assert.ok(ranking.every((r) => r.regiao === "Sudeste"));
  });

  await t.test("buscarRankingPorPeriodo apenasAtivos=false inclui indisponíveis", async () => {
    const ranking = await buscarRankingPorPeriodo({
      inicio,
      fim,
      metrica: "energia",
      apenasAtivos: false,
    });
    // s4 é indisponível mas não tem coletas de sucesso -> não aparece
    // Se tivesse coletas, apareceria
    assert.equal(ranking.length, 3);
  });

  // ------------------------------------------------------------------
  // 3. Comparação de serviços
  // ------------------------------------------------------------------
  await t.test("compararServicosPorPeriodo retorna agregações completas para 2+ serviços", async () => {
    const comp = await compararServicosPorPeriodo({
      servicoIds: [Number(s1), Number(s2), Number(s3)],
      inicio,
      fim,
    });
    assert.equal(comp.length, 3);
    const byNome = Object.fromEntries(comp.map((c) => [c.nome, c]));
    // s1: 2 coletas, energia 0.1+0.2=0.3, emissão 8.5+17=25.5
    assert.equal(byNome["Billing API"].qtdColetas, 2);
    assert.equal(byNome["Billing API"].totalEnergiaKwh, 0.3);
    assert.equal(byNome["Billing API"].totalEmissaoCo2eG, 25.5);
    assert.equal(byNome["Billing API"].mediaEnergiaKwh, 0.15);
    assert.equal(byNome["Billing API"].minEnergiaKwh, 0.1);
    assert.equal(byNome["Billing API"].maxEnergiaKwh, 0.2);
    // s2: 1 coleta
    assert.equal(byNome["Email Dispatcher"].qtdColetas, 1);
    assert.equal(byNome["Email Dispatcher"].totalEnergiaKwh, 0.05);
    // s3: 1 coleta
    assert.equal(byNome["Checkout Worker"].qtdColetas, 1);
    assert.equal(byNome["Checkout Worker"].totalEnergiaKwh, 0.3);
  });

  await t.test("compararServicosPorPeriodo deduplica IDs e exige >=2 distintos", async () => {
    await assert.rejects(
      compararServicosPorPeriodo({ servicoIds: [Number(s1), Number(s1)], inicio, fim }),
      /pelo menos 2 serviços distintos/,
    );
    await assert.rejects(
      compararServicosPorPeriodo({ servicoIds: [Number(s1)], inicio, fim }),
      /pelo menos 2 serviços distintos/,
    );
  });

  await t.test("compararServicosPorPeriodo ordena por ordem dos IDs informados (padrão)", async () => {
    const comp = await compararServicosPorPeriodo({
      servicoIds: [Number(s3), Number(s1)], // Virginia primeiro, depois Sudeste
      inicio,
      fim,
    });
    assert.equal(comp[0].nome, "Checkout Worker");
    assert.equal(comp[1].nome, "Billing API");
  });

  await t.test("compararServicosPorPeriodo ordenação ASC/DESC inverte ordem", async () => {
    const compAsc = await compararServicosPorPeriodo({
      servicoIds: [Number(s1), Number(s3)],
      inicio,
      fim,
      ordenacao: "ASC",
    });
    const compDesc = await compararServicosPorPeriodo({
      servicoIds: [Number(s1), Number(s3)],
      inicio,
      fim,
      ordenacao: "DESC",
    });
    // ASC mantém ordem dos IDs; DESC inverte
    assert.equal(compAsc[0].nome, "Billing API");
    assert.equal(compDesc[0].nome, "Checkout Worker");
  });

  // ------------------------------------------------------------------
  // 4. Agregações — 5 groupBy
  // ------------------------------------------------------------------
  await t.test("agregarMetricasPorPeriodo groupBy=servico", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "servico",
      metricas: ["energia_kwh", "emissao_co2e_g"],
    });
    // 3 serviços ativos com coletas
    assert.equal(agg.length, 3);
    const byGrupo = Object.fromEntries(agg.map((a) => [a.grupo, a]));
    assert.ok(byGrupo["Billing API"]);
    assert.ok(byGrupo["Email Dispatcher"]);
    assert.ok(byGrupo["Checkout Worker"]);
    // Campos corretos por métrica
    assert.ok("sum_energia_kwh" in byGrupo["Billing API"].metricas);
    assert.ok("avg_energia_kwh" in byGrupo["Billing API"].metricas);
    assert.ok("min_energia_kwh" in byGrupo["Billing API"].metricas);
    assert.ok("max_energia_kwh" in byGrupo["Billing API"].metricas);
    assert.ok("count_energia_kwh" in byGrupo["Billing API"].metricas);
    assert.ok("sum_emissao_co2e_g" in byGrupo["Billing API"].metricas);
  });

  await t.test("agregarMetricasPorPeriodo groupBy=regiao consolida serviços da mesma região", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "regiao",
      metricas: ["energia_kwh", "emissao_co2e_g"],
    });
    // 2 regiões com coletas: Sudeste (s1+s2) e Virginia (s3)
    assert.equal(agg.length, 2);
    const byGrupo = Object.fromEntries(agg.map((a) => [a.grupo, a]));
    // Sudeste: energia = 0.3 + 0.05 = 0.35
    const sudeste = byGrupo["Sudeste"];
    assert.ok(sudeste);
    assert.equal(sudeste.metricas.sum_energia_kwh, 0.35);
    // Virginia: energia = 0.3
    const virginia = byGrupo["Virginia"];
    assert.ok(virginia);
    assert.equal(virginia.metricas.sum_energia_kwh, 0.3);
    // Não deve ter s.nome no grupo (consolidado por região)
  });

  await t.test("agregarMetricasPorPeriodo groupBy=aplicacao consolida todos os serviços da app", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "aplicacao",
      metricas: ["energia_kwh"],
    });
    assert.equal(agg.length, 1);
    assert.equal(agg[0].grupo, "App Teste");
    // Total energia de todos: 0.3 + 0.05 + 0.3 = 0.65
    assert.equal(agg[0].metricas.sum_energia_kwh, 0.65);
  });

  await t.test("agregarMetricasPorPeriodo groupBy=dia", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "dia",
      metricas: ["energia_kwh", "cpu_percentual"],
    });
    // Todas as coletas são no mesmo dia (2026-11-01)
    assert.equal(agg.length, 1);
    assert.equal(agg[0].metricas.sum_energia_kwh, 0.65);
    assert.ok("sum_cpu_percentual" in agg[0].metricas);
    assert.ok("avg_cpu_percentual" in agg[0].metricas);
  });

  await t.test("agregarMetricasPorPeriodo groupBy=hora", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "hora",
      metricas: ["energia_kwh"],
    });
    // 10:00 e 10:30 pertencem à mesma hora; 12:00 só tem coletas sem sucesso.
    assert.equal(agg.length, 2);
    assert.deepEqual(agg.map((a) => a.metricas), [
      { sum_energia_kwh: 0.2, avg_energia_kwh: 0.2, min_energia_kwh: 0.2, max_energia_kwh: 0.2, count_energia_kwh: 1 },
      { sum_energia_kwh: 0.45, avg_energia_kwh: 0.15, min_energia_kwh: 0.05, max_energia_kwh: 0.3, count_energia_kwh: 3 },
    ]);
  });

  await t.test("agregarMetricasPorPeriodo ordena por todos os agregados de uma métrica selecionada", async () => {
    for (const campo of ["sum_energia_kwh", "avg_energia_kwh", "min_energia_kwh", "max_energia_kwh", "count_energia_kwh"]) {
      for (const direcao of ["ASC", "DESC"] as const) {
        const agg = await agregarMetricasPorPeriodo({
          inicio, fim, groupBy: "servico", metricas: ["energia_kwh"],
          ordenacao: { campo, direcao },
        });
        assert.equal(agg.length, 3);
        const valores = agg.map((a) => a.metricas[campo]);
        assert.deepEqual(valores, [...valores].sort((a, b) => direcao === "ASC" ? a - b : b - a));
        assert.ok(agg.every((a) => Object.keys(a.metricas).length === 5));
      }
    }
  });

  await t.test("agregarMetricasPorPeriodo permite ordenar por outra métrica quando ela foi selecionada", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio, fim, groupBy: "servico", metricas: ["energia_kwh", "cpu_percentual"],
      ordenacao: { campo: "sum_cpu_percentual", direcao: "DESC" },
    });
    assert.deepEqual(agg.map((a) => a.grupo), ["Billing API", "Checkout Worker", "Email Dispatcher"]);
    assert.deepEqual(agg.map((a) => a.metricas.sum_cpu_percentual), [110, 70, 40]);
  });

  await t.test("agregarMetricasPorPeriodo aceita somente os campos de grupo disponíveis", async () => {
    for (const groupBy of ["servico", "regiao", "aplicacao", "dia", "hora"] as const) {
      const agg = await agregarMetricasPorPeriodo({
        inicio, fim, groupBy, metricas: ["energia_kwh"],
        ordenacao: { campo: "grupo", direcao: "ASC" },
      });
      assert.ok(agg.length > 0);
      if (groupBy === "dia" || groupBy === "hora") continue;
      const porId = await agregarMetricasPorPeriodo({
        inicio, fim, groupBy, metricas: ["energia_kwh"],
        ordenacao: { campo: "grupo_id", direcao: "DESC" },
      });
      const ids = porId.map((a) => a.grupoId!);
      assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
    }
  });

  await t.test("histórico e agregações respeitam paginação e período inclusivo", async () => {
    const historico = await buscarHistoricoPorServico({
      servicoId: Number(s1), inicio, fim, ordenacao: "ASC", limite: 1, offset: 1,
    });
    assert.equal(historico.length, 1);
    assert.equal(historico[0].energiaKwh, 0.2);
    const pagina = await agregarMetricasPorPeriodo({
      inicio, fim, groupBy: "servico", metricas: ["energia_kwh"],
      ordenacao: { campo: "grupo_id", direcao: "ASC" }, limite: 1, offset: 1,
    });
    assert.equal(pagina.length, 1);
    assert.equal(pagina[0].grupoId, Number(s2));
    const instante = new Date("2026-11-01T11:00:00Z");
    const limite = await buscarHistoricoPorServico({ servicoId: Number(s1), inicio: instante, fim: instante });
    assert.equal(limite.length, 1);
    assert.equal(limite[0].energiaKwh, 0.2);
  });

  await t.test("as quatro consultas retornam lista vazia em período sem coletas", async () => {
    const periodo = { inicio: new Date("2025-01-01T00:00:00Z"), fim: new Date("2025-01-02T00:00:00Z") };
    assert.deepEqual(await buscarHistoricoPorServico({ ...periodo, servicoId: Number(s1) }), []);
    assert.deepEqual(await buscarRankingPorPeriodo({ ...periodo, metrica: "energia" }), []);
    assert.deepEqual(await compararServicosPorPeriodo({ ...periodo, servicoIds: [Number(s1), Number(s2)] }), []);
    assert.deepEqual(await agregarMetricasPorPeriodo({ ...periodo, groupBy: "servico", metricas: ["energia_kwh"] }), []);
  });

  // ------------------------------------------------------------------
  // 5. Filtros combinados
  // ------------------------------------------------------------------
  await t.test("agregarMetricasPorPeriodo com filtros servicoIds + aplicacaoId + regiaoId", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "servico",
      metricas: ["energia_kwh"],
      filtros: {
        servicoIds: [Number(s1), Number(s2)],
        aplicacaoId: Number(appId),
        regiaoId: Number(rSudesteId),
        apenasSucesso: true,
      },
    });
    // Apenas s1 e s2 (Sudeste, appId correto)
    assert.equal(agg.length, 2);
    const byGrupo = Object.fromEntries(agg.map((a) => [a.grupo, a]));
    assert.ok(byGrupo["Billing API"]);
    assert.ok(byGrupo["Email Dispatcher"]);
  });

  await t.test("agregarMetricasPorPeriodo groupBy=dia com filtro regiaoId faz JOIN com servicos", async () => {
    // day/hora não têm JOIN com servicos por padrão; com filtro regiaoId deve adicionar
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "dia",
      metricas: ["energia_kwh"],
      filtros: { regiaoId: Number(rSudesteId) },
    });
    // Apenas Sudeste (s1+s2) = 0.35
    assert.equal(agg.length, 1);
    assert.equal(agg[0].metricas.sum_energia_kwh, 0.35);
  });

  await t.test("agregarMetricasPorPeriodo groupBy=hora com filtro aplicacaoId faz JOIN com servicos", async () => {
    const agg = await agregarMetricasPorPeriodo({
      inicio,
      fim,
      groupBy: "hora",
      metricas: ["energia_kwh"],
      filtros: { aplicacaoId: Number(appId) },
    });
    // Todas as coletas são da app, mas filtra corretamente
    const totalEnergia = agg.reduce((sum, a) => sum + a.metricas.sum_energia_kwh, 0);
    assert.equal(totalEnergia, 0.65);
  });

  // ------------------------------------------------------------------
  // 6. Entradas inválidas (validação runtime)
  // ------------------------------------------------------------------
  await t.test("agregarMetricasPorPeriodo rejeita groupBy inválido", async () => {
    await assert.rejects(
      agregarMetricasPorPeriodo({ inicio, fim, groupBy: "invalido" as AgregacaoParams["groupBy"], metricas: ["energia_kwh"] }),
      /groupBy inválido/,
    );
  });

  await t.test("agregarMetricasPorPeriodo rejeita métrica inválida", async () => {
    await assert.rejects(
      agregarMetricasPorPeriodo({ inicio, fim, groupBy: "servico", metricas: ["metrica_inexistente"] as unknown as AgregacaoParams["metricas"] }),
      /Métricas inválidas/,
    );
  });

  await t.test("agregarMetricasPorPeriodo rejeita campo de ordenação não selecionado", async () => {
    // Solicita apenas energia_kwh mas tenta ordenar por sum_cpu_percentual
    await assert.rejects(
      agregarMetricasPorPeriodo({
        inicio,
        fim,
        groupBy: "servico",
        metricas: ["energia_kwh"],
        ordenacao: { campo: "sum_cpu_percentual", direcao: "DESC" },
      }),
      /Campo de ordenação inválido/,
    );
  });

  await t.test("agregarMetricasPorPeriodo rejeita ordenação inválida", async () => {
    await assert.rejects(
      agregarMetricasPorPeriodo({
        inicio,
        fim,
        groupBy: "servico",
        metricas: ["energia_kwh"],
        ordenacao: { campo: "sum_energia_kwh", direcao: "INVALID" as "DESC" },
      }),
      /Ordenação inválida/,
    );
  });

  await t.test("buscarRankingPorPeriodo rejeita métrica inválida", async () => {
    await assert.rejects(
      buscarRankingPorPeriodo({ inicio, fim, metrica: "invalida" as RankingParams["metrica"] }),
      /Métrica de ranking inválida/,
    );
  });

  await t.test("buscarHistoricoPorServico rejeita ordenação inválida", async () => {
    await assert.rejects(
      buscarHistoricoPorServico({ servicoId: Number(s1), inicio, fim, ordenacao: "INVALID" as HistoricoParams["ordenacao"] }),
      /Ordenação inválida/,
    );
  });

  const outrasApps = await banco.query<{ id: string }>(
    "INSERT INTO aplicacoes (nome) VALUES ('Bordas A'), ('Bordas B') RETURNING id",
  );
  const [appA, appB] = outrasApps.rows.map((a) => Number(a.id));
  const bordas = await banco.query<{ id: string }>(
    `INSERT INTO servicos (aplicacao_id, regiao_id, nome, status) VALUES
       ($1, $3, 'Nome repetido', 'ativo'), ($1, $3, 'Nome repetido', 'ativo'),
       ($1, $4, 'Inativo', 'indisponivel'), ($2, $4, 'Removido', 'removido'),
       ($2, NULL, 'Sem região', 'ativo'), ($1, $3, 'Sem coleta', 'ativo'),
       ($1, $3, 'Resultados parciais', 'ativo'), ($2, $4, 'Limites UTC', 'ativo')
     RETURNING id`,
    [appA, appB, rSudesteId, rVirginiaId],
  );
  const [idA, idB, idInativo, idRemovido, idSemRegiao, idSemColeta, idParcial, idUtc] = bordas.rows.map((s) => Number(s.id));
  const periodoBorda = { inicio: new Date("2026-11-02T00:00:00Z"), fim: new Date("2026-11-02T23:59:59.999Z") };
  await banco.query(
    `INSERT INTO metricas_servico
       (servico_id, coletado_em, status_coleta, cpu_percentual, memoria_gb, disco_gb, rede_gb, energia_kwh, emissao_co2e_g)
     VALUES
       ($1, '2026-11-02T00:00:00Z', 'sucesso', 0, 0, 0, 0, 0, 0),
       ($1, '2026-11-02T00:30:00Z', 'sucesso', 10, 1, 2, 3, 0.1, 5),
       ($1, '2026-11-02T00:30:00Z', 'sucesso', 20, 2, 4, 6, 0.2, 10),
       ($2, '2026-11-02T00:30:00Z', 'sucesso', 50, 5, 10, 15, 0.3, 60),
       ($3, '2026-11-02T00:30:00Z', 'sucesso', 40, 4, 8, 12, 0.4, 80),
       ($4, '2026-11-02T00:30:00Z', 'sucesso', 60, 6, 12, 18, 0.6, 120),
       ($5, '2026-11-02T00:30:00Z', 'sucesso', 30, 3, 6, 9, 0.3, 15),
       ($6, '2026-11-02T00:30:00Z', 'sucesso', 80, 8, 16, 24, NULL, NULL),
       ($6, '2026-11-02T01:30:00Z', 'sucesso', NULL, NULL, NULL, NULL, 0.5, NULL),
       ($1, '2026-11-02T00:45:00Z', 'indisponivel', 90, 9, 18, 27, 9, 999),
       ($1, '2026-11-01T23:59:59.999Z', 'sucesso', 99, 99, 99, 99, 999, 999),
       ($1, '2026-11-03T00:00:00Z', 'sucesso', 99, 99, 99, 99, 999, 999),
       ($7, '2026-11-02T23:30:00-03:00', 'sucesso', 1, 1, 1, 1, 0.1, 1),
       ($7, '2026-11-03T03:00:00Z', 'sucesso', 1, 1, 1, 1, 0.2, 2)`,
    [idA, idB, idInativo, idRemovido, idSemRegiao, idParcial, idUtc],
  );

  await t.test("histórico desempata horários pelo ID, preserva zeros e inclui os limites do período", async () => {
    const historico = await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA });
    assert.deepEqual(historico.map((h) => h.energiaKwh), [0.2, 0.1, 0]);
    assert.ok(historico.every((h) => h.coletadoEm instanceof Date));
    const asc = await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA, ordenacao: "ASC" });
    assert.deepEqual(asc.map((h) => h.energiaKwh), [0, 0.1, 0.2]);
    const pagina = await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA, limite: 1, offset: 1 });
    assert.equal(pagina[0].energiaKwh, 0.1);
    const falhas = await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA, apenasSucesso: false });
    assert.deepEqual(falhas.map((h) => h.statusColeta), ["indisponivel", "sucesso", "sucesso", "sucesso"]);
  });

  await t.test("ranking distingue métricas, desempata por ID e pagina sem repetir serviços", async () => {
    const energia = await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia" });
    assert.deepEqual(energia.map((r) => r.servicoId), [idA, idB, idSemRegiao]);
    const carbono = await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "co2e" });
    assert.deepEqual(carbono.map((r) => r.servicoId), [idB, idA, idSemRegiao]);
    assert.deepEqual(energia.map((r) => r.totalEnergiaKwh), [0.3, 0.3, 0.3]);
    const paginas = [];
    for (let offset = 0; offset < energia.length; offset += 1) {
      const pagina = await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia", limite: 1, offset });
      paginas.push(pagina[0].servicoId);
    }
    assert.deepEqual(paginas, energia.map((r) => r.servicoId));
    const todos = await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia", apenasAtivos: false, ordenacao: "ASC" });
    assert.deepEqual(todos.map((r) => r.servicoId), [idA, idB, idSemRegiao, idInativo, idRemovido]);
    const filtro = await buscarRankingPorPeriodo({
      ...periodoBorda, metrica: "co2e", aplicacaoId: appA, regiaoId: Number(rVirginiaId), apenasAtivos: false,
    });
    assert.deepEqual(filtro.map((r) => r.servicoId), [idInativo]);
    assert.equal(energia.find((r) => r.servicoId === idSemRegiao)!.regiao, null);
  });

  await t.test("comparação deduplica, mantém a ordem pedida e omite serviços sem cálculos no período", async () => {
    const comparacao = await compararServicosPorPeriodo({
      ...periodoBorda, servicoIds: [idSemRegiao, idSemColeta, idB, idParcial, idA, idB, 2147483647],
    });
    assert.deepEqual(comparacao.map((c) => c.servicoId), [idSemRegiao, idB, idA]);
    assert.equal(comparacao[2].qtdColetas, 3);
    assert.equal(comparacao[2].minEnergiaKwh, 0);
    assert.equal(comparacao[2].mediaEnergiaKwh, 0.1);
    assert.equal(comparacao[2].minEmissaoCo2eG, 0);
    assert.equal(comparacao[2].maxEmissaoCo2eG, 10);
    assert.equal(comparacao[2].mediaEmissaoCo2eG, 5);
    const descendente = await compararServicosPorPeriodo({ ...periodoBorda, servicoIds: [idA, idB], ordenacao: "DESC" });
    assert.deepEqual(descendente.map((c) => c.servicoId), [idB, idA]);
  });

  await t.test("filtro vazio retorna lista vazia; métricas repetidas não criam aliases ambíguos", async () => {
    for (const groupBy of ["servico", "regiao", "aplicacao", "dia", "hora"] as const) {
      assert.deepEqual(await agregarMetricasPorPeriodo({
        ...periodoBorda, groupBy, metricas: ["energia_kwh"], filtros: { servicoIds: [] },
      }), []);
      const simples = await agregarMetricasPorPeriodo({
        ...periodoBorda, groupBy, metricas: ["energia_kwh"], filtros: { servicoIds: [idA, idB] },
        ordenacao: { campo: "sum_energia_kwh", direcao: "DESC" },
      });
      const repetidas = await agregarMetricasPorPeriodo({
        ...periodoBorda, groupBy, metricas: ["energia_kwh", "energia_kwh"], filtros: { servicoIds: [idA, idB, idA] },
        ordenacao: { campo: "sum_energia_kwh", direcao: "DESC" },
      });
      assert.deepEqual(repetidas, simples);
    }
  });

  await t.test("agregação preserva nomes repetidos, região ausente e paginação com empates", async () => {
    const params = { ...periodoBorda, groupBy: "servico", metricas: ["energia_kwh"], filtros: { servicoIds: [idA, idB] } } satisfies AgregacaoParams;
    const grupos = await agregarMetricasPorPeriodo(params);
    assert.deepEqual(grupos.map((g) => g.grupo), ["Nome repetido", "Nome repetido"]);
    assert.deepEqual(grupos.map((g) => g.grupoId), [idA, idB]);
    const segundo = await agregarMetricasPorPeriodo({ ...params, limite: 1, offset: 1 });
    assert.equal(segundo[0].grupoId, idB);
    const regiao = await agregarMetricasPorPeriodo({
      ...periodoBorda, groupBy: "regiao", metricas: ["energia_kwh"], filtros: { servicoIds: [idSemRegiao] },
    });
    assert.equal(regiao[0].grupo, null);
    assert.equal(regiao[0].grupoId, null);
    assert.equal(regiao[0].metricas.sum_energia_kwh, 0.3);
  });

  await t.test("dados parciais não são convertidos em zero e filtros de status são respeitados", async () => {
    const params = { ...periodoBorda, groupBy: "servico", filtros: { servicoIds: [idParcial] } } satisfies Omit<AgregacaoParams, "metricas">;
    const cpu = await agregarMetricasPorPeriodo({ ...params, metricas: ["cpu_percentual"] });
    assert.equal(cpu[0].metricas.sum_cpu_percentual, 80);
    const energia = await agregarMetricasPorPeriodo({ ...params, metricas: ["energia_kwh"] });
    assert.equal(energia[0].metricas.sum_energia_kwh, 0.5);
    assert.deepEqual(await agregarMetricasPorPeriodo({ ...params, metricas: ["energia_kwh", "cpu_percentual"] }), []);
    const comFalhas = await agregarMetricasPorPeriodo({
      ...periodoBorda, groupBy: "servico", metricas: ["energia_kwh"], filtros: { servicoIds: [idA], apenasSucesso: false },
    });
    assert.equal(comFalhas[0].metricas.sum_energia_kwh, 9.3);
    assert.equal(comFalhas[0].metricas.count_energia_kwh, 4);
  });

  await t.test("dia e hora retornam rótulos de texto em UTC, com limites inclusivos", async () => {
    const intervalo = { inicio: new Date("2026-11-03T00:00:00Z"), fim: new Date("2026-11-03T03:00:00Z") };
    const dia = await agregarMetricasPorPeriodo({ ...intervalo, groupBy: "dia", metricas: ["energia_kwh"], filtros: { servicoIds: [idUtc] } });
    assert.deepEqual(dia.map((a) => a.grupo), ["2026-11-03"]);
    const hora = await agregarMetricasPorPeriodo({ ...intervalo, groupBy: "hora", metricas: ["energia_kwh"], filtros: { servicoIds: [idUtc] } });
    assert.deepEqual(hora.map((a) => a.grupo), ["2026-11-03T03:00:00Z", "2026-11-03T02:00:00Z"]);
    assert.deepEqual(hora.map((a) => a.metricas.sum_energia_kwh), [0.2, 0.1]);
  });

  for (const groupBy of ["dia", "hora"] as const) {
    await t.test(`paginação por ${groupBy} preserva 30 grupos empatados em páginas de um item`, async () => {
      const servico = await banco.query<{ id: string }>(
        "INSERT INTO servicos (aplicacao_id, regiao_id, nome) VALUES ($1, $2, $3) RETURNING id",
        [appA, rSudesteId, `Paginação por ${groupBy}`],
      );
      const servicoId = Number(servico.rows[0].id);
      const intervaloMs = groupBy === "dia" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      const inicio = new Date("2026-12-01T00:00:00Z");
      const coletas = Array.from({ length: 30 }, (_, i) => new Date(inicio.getTime() + i * intervaloMs));
      await banco.query(
        `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh)
         SELECT $1, coletado_em, 'sucesso', 1
         FROM UNNEST($2::timestamptz[]) AS coletas(coletado_em)`,
        [servicoId, coletas],
      );
      const params = {
        inicio, fim: coletas[29], groupBy, metricas: ["energia_kwh"], filtros: { servicoIds: [servicoId] },
      } satisfies AgregacaoParams;
      const esperados = coletas.map((coleta) => groupBy === "dia"
        ? coleta.toISOString().slice(0, 10) : coleta.toISOString().replace(".000Z", "Z"));

      for (const direcao of ["ASC", "DESC"] as const) {
        const ordenacao = { campo: "sum_energia_kwh", direcao };
        const todos = await agregarMetricasPorPeriodo({ ...params, ordenacao, limite: 30 });
        assert.equal(todos.length, 30);
        assert.ok(todos.every((linha) => linha.metricas.sum_energia_kwh === 1));
        const grupos: Array<string | null> = [];
        for (let offset = 0; offset < 30; offset += 1) {
          const pagina = await agregarMetricasPorPeriodo({ ...params, ordenacao, limite: 1, offset });
          assert.equal(pagina.length, 1);
          grupos.push(pagina[0].grupo);
        }
        assert.equal(new Set(grupos).size, 30, `Paginação por ${groupBy} (${direcao}) repetiu grupos`);
        assert.deepEqual(grupos, esperados);
        assert.deepEqual(grupos, todos.map((linha) => linha.grupo));
        assert.deepEqual(await agregarMetricasPorPeriodo({ ...params, ordenacao, limite: 1, offset: 30 }), []);
      }
    });
  }

  await t.test("limite zero e offset além dos dados retornam páginas vazias", async () => {
    for (const pagina of [{ limite: 0 }, { offset: 1000 }]) {
      assert.deepEqual(await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA, ...pagina }), []);
      assert.deepEqual(await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia", ...pagina }), []);
      assert.deepEqual(await agregarMetricasPorPeriodo({ ...periodoBorda, groupBy: "dia", metricas: ["energia_kwh"], ...pagina }), []);
    }
  });

  const valoresMetricas = {
    energia_kwh: [0, 0.1, 0.2, 0.3], emissao_co2e_g: [0, 5, 10, 60],
    cpu_percentual: [0, 10, 20, 50], memoria_gb: [0, 1, 2, 5],
    disco_gb: [0, 2, 4, 10], rede_gb: [0, 3, 6, 15],
  };
  for (const groupBy of ["servico", "regiao", "aplicacao", "dia", "hora"] as const) {
    for (const metrica of Object.keys(valoresMetricas) as Array<keyof typeof valoresMetricas>) {
      await t.test(`matriz SQL: ${groupBy}, ${metrica}, cinco agregados e duas direções`, async () => {
        const params = { ...periodoBorda, groupBy, metricas: [metrica], filtros: { servicoIds: [idA, idB] } };
        const resultado = await agregarMetricasPorPeriodo(params);
        assert.equal(resultado.length, groupBy === "servico" ? 2 : 1);
        for (const linha of resultado) {
          const valores = groupBy !== "servico" ? valoresMetricas[metrica]
            : linha.grupoId === idA ? valoresMetricas[metrica].slice(0, 3) : valoresMetricas[metrica].slice(3);
          const soma = valores.reduce((total, v) => total + v, 0);
          const esperados = { sum: soma, avg: soma / valores.length, min: Math.min(...valores), max: Math.max(...valores), count: valores.length };
          assert.equal(Object.keys(linha.metricas).length, 5);
          for (const [agregado, esperado] of Object.entries(esperados)) {
            assert.ok(Math.abs(linha.metricas[`${agregado}_${metrica}`] - esperado) < 1e-9, `${agregado}_${metrica}`);
          }
        }
        for (const agregado of ["sum", "avg", "min", "max", "count"]) {
          const campo = `${agregado}_${metrica}`;
          for (const direcao of ["ASC", "DESC"] as const) {
            const linhas = await agregarMetricasPorPeriodo({ ...params, ordenacao: { campo, direcao } });
            const valores = linhas.map((l) => l.metricas[campo]);
            assert.deepEqual(valores, [...valores].sort((a, b) => direcao === "ASC" ? a - b : b - a));
          }
        }
      });
    }
  }

  await t.test("listas extensas de IDs usam parâmetros de array sem exceder o protocolo PostgreSQL", async () => {
    const servicoIds = [idA, ...Array.from({ length: 65536 }, (_, i) => 100000 + i), idB];
    const comparacao = await compararServicosPorPeriodo({ ...periodoBorda, servicoIds });
    assert.deepEqual(comparacao.map((c) => c.servicoId), [idA, idB]);
    const agregacao = await agregarMetricasPorPeriodo({ ...periodoBorda, groupBy: "servico", metricas: ["energia_kwh"], filtros: { servicoIds } });
    assert.deepEqual(agregacao.map((a) => a.grupoId), [idA, idB]);
  });

  await t.test("falhas reais de SQL são propagadas pelas quatro consultas", async () => {
    await banco.query("ALTER TABLE metricas_servico RENAME TO metricas_servico_indisponivel");
    try {
      const tabelaAusente = (erro: unknown) => (erro as { code?: string }).code === "42P01";
      await assert.rejects(buscarHistoricoPorServico({ ...periodoBorda, servicoId: idA }), tabelaAusente);
      await assert.rejects(buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia" }), tabelaAusente);
      await assert.rejects(compararServicosPorPeriodo({ ...periodoBorda, servicoIds: [idA, idB] }), tabelaAusente);
      await assert.rejects(agregarMetricasPorPeriodo({ ...periodoBorda, groupBy: "dia", metricas: ["energia_kwh"] }), tabelaAusente);
    } finally {
      await banco.query("ALTER TABLE metricas_servico_indisponivel RENAME TO metricas_servico");
    }
  });

  await t.test("IDs BIGSERIAL acima de 32 bits e até MAX_SAFE_INTEGER são preservados", async () => {
    const idGrande = 2147483648;
    const idMaximo = Number.MAX_SAFE_INTEGER;
    await banco.query("INSERT INTO aplicacoes (id, nome) VALUES ($1, 'Aplicação BIGSERIAL')", [idGrande]);
    await banco.query(
      "INSERT INTO regioes (id, nome, pais, fator_co2e_g_kwh, ano_referencia) VALUES ($1, 'Região BIGSERIAL', 'Brazil', 85, 2026)",
      [idGrande],
    );
    await banco.query(
      "INSERT INTO servicos (id, aplicacao_id, regiao_id, nome) VALUES ($1, $1, $1, 'ID grande'), ($2, $1, $1, 'ID máximo seguro')",
      [idGrande, idMaximo],
    );
    await banco.query(
      `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g)
       VALUES ($1, '2026-11-02T00:00:00Z', 'sucesso', 0.1, 1), ($2, '2026-11-02T00:00:00Z', 'sucesso', 0.1, 1)`,
      [idGrande, idMaximo],
    );
    const historico = await buscarHistoricoPorServico({ ...periodoBorda, servicoId: idMaximo });
    assert.equal(historico[0].energiaKwh, 0.1);
    const ranking = await buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia", aplicacaoId: idGrande });
    assert.deepEqual(ranking.map((r) => r.servicoId), [idGrande, idMaximo]);
    const comparacao = await compararServicosPorPeriodo({ ...periodoBorda, servicoIds: [idMaximo, idGrande] });
    assert.deepEqual(comparacao.map((c) => c.servicoId), [idMaximo, idGrande]);
    for (const groupBy of ["servico", "regiao", "aplicacao"] as const) {
      const agregacao = await agregarMetricasPorPeriodo({
        ...periodoBorda, groupBy, metricas: ["energia_kwh"], filtros: { aplicacaoId: idGrande, regiaoId: idGrande },
        ordenacao: { campo: "grupo_id", direcao: "ASC" },
      });
      assert.deepEqual(agregacao.map((g) => g.grupoId), groupBy === "servico" ? [idGrande, idMaximo] : [idGrande]);
    }
    // Valores além da precisão do contrato são recusados, sem retornar um ID arredondado.
    const idInseguro = "9007199254740993";
    await banco.query("INSERT INTO servicos (id, aplicacao_id, regiao_id, nome) VALUES ($1, $2, $2, 'ID fora do contrato')", [idInseguro, idGrande]);
    await banco.query(
      "INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g) VALUES ($1, '2026-11-02T00:00:00Z', 'sucesso', 0.1, 1)",
      [idInseguro],
    );
    await assert.rejects(buscarRankingPorPeriodo({ ...periodoBorda, metrica: "energia", aplicacaoId: idGrande }), /inteiro positivo seguro/);
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodoBorda, groupBy: "servico", metricas: ["energia_kwh"], filtros: { aplicacaoId: idGrande },
    }), /inteiro positivo seguro/);
  });
});
