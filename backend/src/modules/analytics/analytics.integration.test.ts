import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import pg from "pg";

import { consultar, encerrarConexao } from "../../db/connection.ts";
import {
  buscarHistoricoPorServico,
  buscarRankingPorPeriodo,
  compararServicosPorPeriodo,
  agregarMetricasPorPeriodo,
  encerrarPool,
} from "./analytics.repository.ts";

const { Pool } = pg;

test("Módulo Analytics — consultas SQL com PostgreSQL real", async (t) => {
  // Isola cada execução em schema próprio
  const schema = `analytics_${randomUUID().replaceAll("-", "")}`;
  const administrador = new Pool({ connectionTimeoutMillis: 5000 });
  await administrador.query(`CREATE SCHEMA "${schema}"`);
  const banco = new Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
  const opcoesAnteriores = process.env.PGOPTIONS;
  process.env.PGOPTIONS = `-c search_path=${schema}`;

  const encerramentos: Array<() => Promise<void>> = [];
  t.after(async () => {
    try {
      await Promise.all(encerramentos.map((encerrar) => encerrar()));
      await banco.end();
      await administrador.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await administrador.end();
      if (opcoesAnteriores === undefined) delete process.env.PGOPTIONS;
      else process.env.PGOPTIONS = opcoesAnteriores;
    }
  });

  // Cria schema no banco isolado
  await banco.query(await readFile(new URL("../../../../database/schema.sql", import.meta.url), "utf8"));
  encerramentos.push(encerrarConexao, encerrarPool);

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
    // Coletas em 10:00, 10:30, 11:00, 12:00 -> 4 horas distintas
    // 10:00 tem s1 e s3; 10:30 tem s2; 11:00 tem s1; 12:00 tem sem_metricas/indisponivel (não contam)
    assert.ok(agg.length >= 3);
    const totalEnergia = agg.reduce((sum, a) => sum + a.metricas.sum_energia_kwh, 0);
    assert.equal(totalEnergia, 0.65);
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
      agregarMetricasPorPeriodo({ inicio, fim, groupBy: "invalido" as any, metricas: ["energia_kwh"] }),
      /groupBy inválido/,
    );
  });

  await t.test("agregarMetricasPorPeriodo rejeita métrica inválida", async () => {
    await assert.rejects(
      agregarMetricasPorPeriodo({ inicio, fim, groupBy: "servico", metricas: ["metrica_inexistente"] as any }),
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
        ordenacao: { campo: "sum_energia_kwh", direcao: "INVALID" as any },
      }),
      /Ordenação inválida/,
    );
  });

  await t.test("buscarRankingPorPeriodo rejeita métrica inválida", async () => {
    await assert.rejects(
      buscarRankingPorPeriodo({ inicio, fim, metrica: "invalida" as any }),
      /Métrica de ranking inválida/,
    );
  });

  await t.test("buscarHistoricoPorServico rejeita ordenação inválida", async () => {
    await assert.rejects(
      buscarHistoricoPorServico({ servicoId: Number(s1), inicio, fim, ordenacao: "INVALID" as any }),
      /Ordenação inválida/,
    );
  });

  // ------------------------------------------------------------------
  // 7. Encerramento do pool
  // ------------------------------------------------------------------
  await t.test("encerrarPool encerra a conexão sem erro", async () => {
    await assert.doesNotReject(encerrarPool());
    // Chamar novamente não deve falhar (idempotente)
    await assert.doesNotReject(encerrarPool());
  });
});