import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import {
  agregarMetricasPorPeriodo,
  buscarHistoricoPorServico,
  buscarRankingPorPeriodo,
  compararServicosPorPeriodo,
} from "./analytics.repository.ts";
import type { AgregacaoParams, HistoricoParams, RankingParams } from "./analytics.repository.ts";

const periodo = { inicio: new Date("2026-11-01T00:00:00Z"), fim: new Date("2026-11-02T00:00:00Z") };

test("analytics rejeita entradas inválidas antes de consultar o banco", async (t) => {
  const consulta = t.mock.method(pg.Pool.prototype, "query", async () => {
    throw new Error("A validação não deve consultar o banco");
  });
  t.after(() => assert.equal(consulta.mock.callCount(), 0));

  await t.test("não permite ordenar por nenhum agregado de uma métrica não solicitada", async () => {
    for (const groupBy of ["servico", "regiao", "aplicacao", "dia", "hora"] as const) {
      for (const agregado of ["sum", "avg", "min", "max", "count"]) {
        await assert.rejects(agregarMetricasPorPeriodo({
          ...periodo, groupBy, metricas: ["energia_kwh"],
          ordenacao: { campo: `${agregado}_cpu_percentual`, direcao: "DESC" },
        }), /Campo de ordenação inválido/);
      }
    }
  });

  await t.test("grupo_id não está disponível nos agrupamentos por dia ou hora", async () => {
    for (const groupBy of ["dia", "hora"] as const) {
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy, metricas: ["energia_kwh"],
        ordenacao: { campo: "grupo_id", direcao: "ASC" },
      }), /Campo de ordenação inválido/);
    }
  });

  await t.test("rejeita lista de métricas vazia", async () => {
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodo, groupBy: "servico", metricas: [],
    }), /Pelo menos uma métrica/);
  });

  await t.test("rejeita agrupamentos e métricas fora da lista permitida", async () => {
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodo, groupBy: "servico; DROP TABLE servicos" as AgregacaoParams["groupBy"], metricas: ["energia_kwh"],
    }), /groupBy inválido/);
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodo, groupBy: "servico", metricas: ["energia_kwh", "inexistente"] as AgregacaoParams["metricas"],
    }), /Métricas inválidas/);
  });

  await t.test("rejeita campos e direções arbitrários na ordenação", async () => {
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodo, groupBy: "servico", metricas: ["energia_kwh"],
      ordenacao: { campo: 'sum_energia_kwh"; DROP TABLE servicos; --', direcao: "ASC" },
    }), /Campo de ordenação inválido/);
    await assert.rejects(agregarMetricasPorPeriodo({
      ...periodo, groupBy: "servico", metricas: ["energia_kwh"],
      ordenacao: { campo: "sum_energia_kwh", direcao: "DESC NULLS LAST" as "DESC" },
    }), /Ordenação inválida/);
  });

  await t.test("histórico e ranking rejeitam direção inválida e ranking rejeita métrica inválida", async () => {
    await assert.rejects(buscarHistoricoPorServico({
      ...periodo, servicoId: 1, ordenacao: "invalida" as HistoricoParams["ordenacao"],
    }), /Ordenação inválida/);
    await assert.rejects(buscarRankingPorPeriodo({
      ...periodo, metrica: "energia", ordenacao: "invalida" as RankingParams["ordenacao"],
    }), /Ordenação inválida/);
    await assert.rejects(buscarRankingPorPeriodo({
      ...periodo, metrica: "invalida" as RankingParams["metrica"],
    }), /Métrica de ranking inválida/);
  });

  await t.test("comparação exige pelo menos dois serviços distintos e uma direção válida", async () => {
    for (const servicoIds of [[], [1], [1, 1]]) {
      await assert.rejects(compararServicosPorPeriodo({ ...periodo, servicoIds }), /pelo menos 2 serviços distintos/);
    }
    await assert.rejects(compararServicosPorPeriodo({
      ...periodo, servicoIds: [1, 2], ordenacao: "invalida" as "ASC",
    }), /Ordenação inválida/);
  });

  await t.test("todas as consultas rejeitam datas inválidas e períodos invertidos", async () => {
    const consultas = [
      (datas: typeof periodo) => buscarHistoricoPorServico({ ...datas, servicoId: 1 }),
      (datas: typeof periodo) => buscarRankingPorPeriodo({ ...datas, metrica: "energia" }),
      (datas: typeof periodo) => compararServicosPorPeriodo({ ...datas, servicoIds: [1, 2] }),
      (datas: typeof periodo) => agregarMetricasPorPeriodo({ ...datas, groupBy: "dia", metricas: ["energia_kwh"] }),
    ];
    for (const executar of consultas) {
      for (const invalida of [new Date(NaN), null, "2026-11-01", 1, undefined]) {
        await assert.rejects(executar({ ...periodo, inicio: invalida as Date }), /datas válidas/);
        await assert.rejects(executar({ ...periodo, fim: invalida as Date }), /datas válidas/);
      }
      await assert.rejects(executar({ inicio: periodo.fim, fim: periodo.inicio }), /anterior ou igual/);
    }
  });

  await t.test("paginação rejeita negativos, frações, valores não finitos e tipos incorretos", async () => {
    for (const campo of ["limite", "offset"] as const) {
      for (const valor of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, null, "10"]) {
        const pagina = { [campo]: valor };
        await assert.rejects(buscarHistoricoPorServico({ ...periodo, servicoId: 1, ...pagina }), /inteiro não negativo/);
        await assert.rejects(buscarRankingPorPeriodo({ ...periodo, metrica: "energia", ...pagina }), /inteiro não negativo/);
        await assert.rejects(agregarMetricasPorPeriodo({ ...periodo, groupBy: "dia", metricas: ["energia_kwh"], ...pagina }), /inteiro não negativo/);
      }
    }
  });

  await t.test("IDs e listas de IDs inválidos são rejeitados em todos os filtros", async () => {
    for (const valor of [0, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, null, "1; DROP TABLE servicos"]) {
      const id = valor as number;
      await assert.rejects(buscarHistoricoPorServico({ ...periodo, servicoId: id }), /inteiro positivo/);
      await assert.rejects(compararServicosPorPeriodo({ ...periodo, servicoIds: [1, id] }), /inteiro positivo/);
      for (const campo of ["aplicacaoId", "regiaoId"] as const) {
        await assert.rejects(buscarRankingPorPeriodo({ ...periodo, metrica: "energia", [campo]: id }), /inteiro positivo/);
        await assert.rejects(agregarMetricasPorPeriodo({
          ...periodo, groupBy: "dia", metricas: ["energia_kwh"], filtros: { [campo]: id },
        }), /inteiro positivo/);
      }
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: ["energia_kwh"], filtros: { servicoIds: [id] },
      }), /inteiro positivo/);
    }
    for (const ids of [null, "1,2", {}, 1]) {
      await assert.rejects(compararServicosPorPeriodo({ ...periodo, servicoIds: ids as number[] }), /lista de IDs/);
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: ["energia_kwh"], filtros: { servicoIds: ids as number[] },
      }), /lista de IDs/);
    }
  });

  await t.test("flags e objetos malformados não ampliam a consulta silenciosamente", async () => {
    for (const valor of [null, "false", 0, {}]) {
      const flag = valor as boolean;
      await assert.rejects(buscarHistoricoPorServico({ ...periodo, servicoId: 1, apenasSucesso: flag }), /booleano/);
      await assert.rejects(buscarRankingPorPeriodo({ ...periodo, metrica: "energia", apenasAtivos: flag }), /booleano/);
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: ["energia_kwh"], filtros: { apenasSucesso: flag },
      }), /booleano/);
    }
    for (const filtros of [null, false, "", []]) {
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: ["energia_kwh"], filtros: filtros as AgregacaoParams["filtros"],
      }), /Filtros devem ser um objeto/);
    }
    for (const metricas of [null, "energia_kwh", {}]) {
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: metricas as AgregacaoParams["metricas"],
      }), /Métricas devem ser uma lista/);
    }
    for (const ordenacao of [null, false, "", []]) {
      await assert.rejects(agregarMetricasPorPeriodo({
        ...periodo, groupBy: "dia", metricas: ["energia_kwh"], ordenacao: ordenacao as unknown as AgregacaoParams["ordenacao"],
      }), /Ordenação deve ser um objeto/);
    }
  });
});
