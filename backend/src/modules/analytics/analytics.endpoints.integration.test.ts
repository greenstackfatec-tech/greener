// Configurar variáveis de ambiente ANTES de importar módulos que criam pools
process.env.PGHOST ??= "localhost";
process.env.PGPORT ??= "5432";
process.env.PGDATABASE ??= "greener";
process.env.PGUSER ??= "greener";
process.env.PGPASSWORD ??= "greener_dev_only";

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { gerarToken } from "../auth/jwt.ts";
import { tratarRequisicao } from "../../app.ts";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import { salvarServico } from "../services/services.repository.ts";
import { gravarColeta } from "../collections/collections.repository.ts";
import type { RankingDetalhado } from "./ranking.repository.ts";

interface HistoricoResponse {
  dados: Array<{
    coletadoEm: string;
    energiaKwh: number | null;
    emissaoCo2eG: number | null;
    statusColeta: string;
    [key: string]: unknown;
  }>;
  periodo: { inicio: string; fim: string };
}

interface RankingResponse {
  dados: Array<{
    nome: string;
    regiao: string | null;
    pais: string | null;
    totalEnergiaKwh: number;
    totalEmissaoCo2eG: number;
    qtdColetas: number;
    mediaEnergiaKwh: number;
    mediaEmissaoCo2eG: number;
    servicoId: number;
  }>;
  periodo: { inicio: string; fim: string };
  metrica: string;
  ordenacao: string;
}

interface ComparacaoResponse {
  dados: Array<{
    nome: string;
    servicoId: number;
    totalEnergiaKwh: number;
    totalEmissaoCo2eG: number;
    qtdColetas: number;
    [key: string]: unknown;
  }>;
  periodo: { inicio: string; fim: string };
  avisos: string[];
}

interface ErrorResponse {
  error: string;
  message?: string;
}

/**
 * Testes de integração das rotas HTTP de Analytics (histórico, ranking, comparação).
 * Exige o PostgreSQL com schema e seed; apaga no fim só o que o teste criou.
 */
test("GET /analytics/* — rotas de histórico, ranking e comparação", async (t) => {
  const segredoAnterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomBytes(48).toString("base64url");
  t.after(() => {
    if (segredoAnterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = segredoAnterior;
  });
  const headersAutenticacao = { authorization: `Bearer ${await gerarToken("1")}` };
  // Criar dados de teste: aplicação, região, serviços e coletas
  const idExterno = `teste-analytics-${randomUUID()}`;
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response);
  });
  t.after(async () => {
    servidor.close();
    servidor.closeAllConnections();
    await consultar(
      "DELETE FROM metricas_servico WHERE servico_id IN (SELECT id FROM servicos WHERE id_externo LIKE $1)",
      [`${idExterno}%`],
    );
    await consultar("DELETE FROM servicos WHERE id_externo LIKE $1", [`${idExterno}%`]);
    await encerrarConexao();
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;

  // Buscar aplicação e região do seed
  const ids = await consultar<{ aplicacao: number; regiao: number }>(
    `SELECT a.id::int AS aplicacao, r.id::int AS regiao
     FROM aplicacoes a, regioes r
     WHERE a.nome = 'GreenER Demo' AND r.nome = 'Sudeste'`,
  );
  const seed = ids.rows[0];
  assert.ok(seed, "seed sem a aplicação GreenER Demo ou a região Sudeste");

  // Criar 3 serviços para teste: 2 no Sudeste, 1 em outra região
  const regiaoVirginia = await consultar<{ id: number }>(
    "SELECT id::int FROM regioes WHERE nome = 'Virginia' AND pais = 'United States'",
  );
  const rVirginiaId = regiaoVirginia.rows[0].id;

  const servicos = await Promise.all([
    salvarServico({
      idExterno: `${idExterno}-1`,
      nome: "Serviço Histórico A",
      aplicacaoId: seed.aplicacao,
      regiaoId: seed.regiao,
      cidade: "São Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
    }),
    salvarServico({
      idExterno: `${idExterno}-2`,
      nome: "Serviço Histórico B",
      aplicacaoId: seed.aplicacao,
      regiaoId: seed.regiao,
      cidade: "São Paulo",
      latitude: -23.5505,
      longitude: -46.6333,
    }),
    salvarServico({
      idExterno: `${idExterno}-3`,
      nome: "Serviço Virginia",
      aplicacaoId: seed.aplicacao,
      regiaoId: rVirginiaId,
      cidade: "Ashburn",
      latitude: 39.0438,
      longitude: -77.4874,
    }),
  ]);
  const [s1, s2, s3] = servicos;

  // Inserir coletas de teste - gravarColeta usa NOW(), então usamos período amplo para evitar problemas de clock skew
  const agora = new Date();
  const inicio = new Date(agora.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48h atrás
  const fim = new Date(agora.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2h no futuro
  // Grava a primeira coleta de s1 antes da segunda para evitar ordem não determinística no histórico com Promise.all.
  await gravarColeta({
    servicoId: s1.id, cpuPercentual: 50, memoriaGb: 2, discoGb: 10, redeGb: 1,
    intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 43.375,
    duracaoSegundos: 60, energiaKwh: 0.1, emissaoCo2eG: 8.5,
  });
  await Promise.all([
    gravarColeta({
      servicoId: s1.id, cpuPercentual: 60, memoriaGb: 3, discoGb: 12, redeGb: 2,
      intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 52.5,
      duracaoSegundos: 60, energiaKwh: 0.2, emissaoCo2eG: 17.0,
    }),
    // s2: 1 coleta de sucesso
    gravarColeta({
      servicoId: s2.id, cpuPercentual: 40, memoriaGb: 1, discoGb: 5, redeGb: 0.5,
      intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 35.0,
      duracaoSegundos: 60, energiaKwh: 0.05, emissaoCo2eG: 4.25,
    }),
    // s3 (Virginia): 1 coleta de sucesso
    gravarColeta({
      servicoId: s3.id, cpuPercentual: 70, memoriaGb: 4, discoGb: 20, redeGb: 5,
      intervaloSegundos: 60, statusColeta: "sucesso", potenciaEstimadaW: 75.0,
      duracaoSegundos: 60, energiaKwh: 0.3, emissaoCo2eG: 113.4,
    }),
  ]);

  const periodoParams = `inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;

  // ------------------------------------------------------------------
  // 1. Histórico por serviço
  // ------------------------------------------------------------------
  await t.test("GET /analytics/historico/:servicoId — retorna coletas do período", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/historico/${s1.id}?${periodoParams}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as HistoricoResponse;
    assert.ok(Array.isArray(body.dados), "dados deve ser array");
    assert.equal(body.dados.length, 2, "deve retornar 2 coletas para s1");
    // O service retorna datas com milissegundos (.000Z), normalizar para comparação
    const normalizarPeriodo = (p: { inicio: string; fim: string }) => ({
      inicio: new Date(p.inicio).toISOString(),
      fim: new Date(p.fim).toISOString(),
    });
    assert.deepEqual(normalizarPeriodo(body.periodo), normalizarPeriodo({ inicio, fim }));
    // Verificar ordem DESC (mais recente primeiro)
    assert.equal(body.dados[0].energiaKwh, 0.2);
    assert.equal(body.dados[1].energiaKwh, 0.1);
    // Verificar estrutura de cada ponto
    for (const ponto of body.dados) {
      assert.ok("coletadoEm" in ponto);
      assert.ok("energiaKwh" in ponto);
      assert.ok("emissaoCo2eG" in ponto);
      assert.ok("statusColeta" in ponto);
    }
  });

  await t.test("GET /analytics/historico/:servicoId — apenasSucesso=false inclui sem_metricas", async () => {
    // Inserir uma coleta sem_metricas
    await gravarColeta({
      servicoId: s1.id, cpuPercentual: 0, memoriaGb: 0, discoGb: 0, redeGb: 0,
      intervaloSegundos: 60, statusColeta: "sem_metricas", potenciaEstimadaW: 0,
      duracaoSegundos: 60, energiaKwh: 0, emissaoCo2eG: 0,
    });

    const resposta = await fetch(`${baseUrl}/analytics/historico/${s1.id}?${periodoParams}&apenasSucesso=false`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as HistoricoResponse;
    assert.equal(body.dados.length, 3); // 2 sucesso + 1 sem_metricas
    const statuses = body.dados.map((p: { statusColeta: string }) => p.statusColeta).sort();
    assert.deepEqual(statuses, ["sem_metricas", "sucesso", "sucesso"]);
  });

  await t.test("GET /analytics/historico/:servicoId — ordenacao=ASC", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/historico/${s1.id}?${periodoParams}&ordenacao=ASC`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as HistoricoResponse;
    // ASC = mais antigo primeiro
    assert.equal(body.dados[0].energiaKwh, 0.1);
    assert.equal(body.dados[1].energiaKwh, 0.2);
  });

  await t.test("GET /analytics/historico/:servicoId — paginação (limite, offset)", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/historico/${s1.id}?${periodoParams}&limite=1&offset=1`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as HistoricoResponse;
    assert.equal(body.dados.length, 1);
    // Default ordenacao=DESC, então primeira=0.2, segunda (offset 1)=0.1
    assert.equal(body.dados[0].energiaKwh, 0.1);
  });

  await t.test("GET /analytics/historico/:servicoId — serviço sem coletas retorna lista vazia", async () => {
    // Criar serviço sem coletas
    const sSemColeta = await salvarServico({
      idExterno: `${idExterno}-sem-coleta`,
      nome: "Sem Coletas",
      aplicacaoId: seed.aplicacao,
      regiaoId: seed.regiao,
      cidade: null, latitude: null, longitude: null,
    });
    const resposta = await fetch(`${baseUrl}/analytics/historico/${sSemColeta.id}?${periodoParams}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as HistoricoResponse;
    assert.deepEqual(body.dados, []);
  });

  await t.test("GET /analytics/historico/:servicoId — ID inválido retorna 400", async () => {
    for (const id of ["abc", "0", "-1", "1.5"]) {
      const resposta = await fetch(`${baseUrl}/analytics/historico/${id}?${periodoParams}`, { headers: headersAutenticacao });
      assert.equal(resposta.status, 400, `id=${id}`);
      const body = await resposta.json() as ErrorResponse;
      assert.equal(body.error, "invalid_id");
    }
  });

  await t.test("GET /analytics/historico/:servicoId — período inválido retorna 400", async () => {
    // Início depois do fim
    const resposta = await fetch(`${baseUrl}/analytics/historico/${s1.id}?inicio=2026-11-16T00:00:00Z&fim=2026-11-15T00:00:00Z`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 400);
    const body = await resposta.json() as ErrorResponse;
    assert.equal(body.error, "invalid_period");
  });

  // ------------------------------------------------------------------
  // 2. Ranking
  // ------------------------------------------------------------------
  await t.test("GET /analytics/ranking — ordena por energia DESC (padrão)", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=energia`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    assert.ok(Array.isArray(body.dados));
    assert.equal(body.metrica, "energia");
    assert.equal(body.ordenacao, "DESC");
    // O service retorna datas com milissegundos (.000Z), normalizar para comparação
    const normalizarPeriodo = (p: { inicio: string; fim: string }) => ({
      inicio: new Date(p.inicio).toISOString(),
      fim: new Date(p.fim).toISOString(),
    });
    assert.deepEqual(normalizarPeriodo(body.periodo), normalizarPeriodo({ inicio, fim }));
    // Verificar que nossos serviços aparecem com totais corretos
    const s1Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Histórico A")!;
    assert.ok(s1Rank, "Serviço Histórico A deve aparecer no ranking");
    assert.equal(s1Rank.totalEnergiaKwh, 0.3);
    assert.equal(s1Rank.totalEmissaoCo2eG, 25.5);
    const s2Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Histórico B")!;
    assert.ok(s2Rank, "Serviço Histórico B deve aparecer no ranking");
    assert.equal(s2Rank.totalEnergiaKwh, 0.05);
    const s3Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Virginia")!;
    assert.ok(s3Rank, "Serviço Virginia deve aparecer no ranking");
    assert.equal(s3Rank.totalEnergiaKwh, 0.3);
  });

  await t.test("GET /analytics/ranking — ordena por co2e DESC", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=co2e`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    assert.equal(body.metrica, "co2e");
    // Verificar que nossos serviços aparecem com totais corretos
    const s3Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Virginia")!;
    assert.ok(s3Rank, "Serviço Virginia deve aparecer no ranking");
    assert.equal(s3Rank.totalEmissaoCo2eG, 113.4);
    const s1Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Histórico A")!;
    assert.ok(s1Rank);
    assert.equal(s1Rank.totalEmissaoCo2eG, 25.5);
    const s2Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Histórico B")!;
    assert.ok(s2Rank);
    assert.equal(s2Rank.totalEmissaoCo2eG, 4.25);
    // Verificar ordenação: Virginia (113.4) > Histórico A (25.5) > Histórico B (4.25)
    const idxVirginia = body.dados.findIndex((r: { nome: string }) => r.nome === "Serviço Virginia");
    const idxHistA = body.dados.findIndex((r: { nome: string }) => r.nome === "Serviço Histórico A");
    const idxHistB = body.dados.findIndex((r: { nome: string }) => r.nome === "Serviço Histórico B");
    assert.ok(idxVirginia < idxHistA, "Virginia deve vir antes de Histórico A");
    assert.ok(idxHistA < idxHistB, "Histórico A deve vir antes de Histórico B");
  });

  await t.test("GET /analytics/ranking — ordenacao=ASC", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=energia&ordenacao=ASC`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    assert.equal(body.ordenacao, "ASC");
    // ASC = menor primeiro - nosso Histórico B (0.05) deve estar entre os primeiros
    const s2Rank = body.dados.find((r: { nome: string }) => r.nome === "Serviço Histórico B")!;
    assert.ok(s2Rank);
    // Verificar que a ordenação é ASC (menor energia primeiro)
    const energias = body.dados.map((r: { totalEnergiaKwh: number }) => r.totalEnergiaKwh);
    const ordenado = [...energias].sort((a, b) => a - b);
    assert.deepEqual(energias, ordenado);
  });

  await t.test("GET /analytics/ranking — filtro aplicacaoId", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=energia&aplicacaoId=${seed.aplicacao}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    // Verificar que nossos 3 serviços aparecem com dados corretos
    for (const nome of ["Serviço Histórico A", "Serviço Histórico B", "Serviço Virginia"]) {
      const svc = body.dados.find((r: { nome: string }) => r.nome === nome);
      assert.ok(svc, `Serviço ${nome} deve aparecer no ranking`);
    }
  });

  await t.test("GET /analytics/ranking — filtro regiaoId", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=energia&regiaoId=${seed.regiao}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    // s1 e s2 estão no Sudeste (região do seed)
    for (const nome of ["Serviço Histórico A", "Serviço Histórico B"]) {
      const svc = body.dados.find((r: { nome: string }) => r.nome === nome);
      assert.ok(svc, `Serviço ${nome} deve aparecer no ranking`);
    }
    // Todos os resultados devem ser da região Sudeste
    assert.ok(body.dados.every((r: { regiao: string | null }) => r.regiao === "Sudeste"));
  });

  await t.test("GET /analytics/ranking — apenasAtivos=false", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=energia&apenasAtivos=false`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as RankingResponse;
    // Nossos 3 serviços estão ativos, devem aparecer
    for (const nome of ["Serviço Histórico A", "Serviço Histórico B", "Serviço Virginia"]) {
      const svc = body.dados.find((r: { nome: string }) => r.nome === nome);
      assert.ok(svc, `Serviço ${nome} deve aparecer no ranking`);
    }
  });

  await t.test("GET /analytics/ranking — métrica inválida retorna 400", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}&metrica=invalida`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 400);
    const body = await resposta.json() as ErrorResponse;
    assert.equal(body.error, "invalid_metric");
  });

  await t.test("GET /analytics/ranking — parâmetros obrigatórios ausentes retorna 400", async () => {
    // Sem inicio
    const resposta1 = await fetch(`${baseUrl}/analytics/ranking?fim=${encodeURIComponent(fim)}&metrica=energia`, { headers: headersAutenticacao });
    assert.equal(resposta1.status, 400);
    const body1 = await resposta1.json() as ErrorResponse;
    assert.equal(body1.error, "invalid_period");
    // Sem fim
    const resposta2 = await fetch(`${baseUrl}/analytics/ranking?inicio=${encodeURIComponent(inicio)}&metrica=energia`, { headers: headersAutenticacao });
    assert.equal(resposta2.status, 400);
    const body2 = await resposta2.json() as ErrorResponse;
    assert.equal(body2.error, "invalid_period");
    // Sem metrica
    const resposta3 = await fetch(`${baseUrl}/analytics/ranking?${periodoParams}`, { headers: headersAutenticacao });
    assert.equal(resposta3.status, 400);
    const body3 = await resposta3.json() as ErrorResponse;
    assert.equal(body3.error, "invalid_metric");
  });

  await t.test("ranking com agregação, tendência e resumo antes da paginação", async (t) => {
    const nomeProjeto = `${idExterno}-ranking`;
    const projetos = (await consultar<{ id: number; nome: string }>(
      "INSERT INTO aplicacoes (nome) VALUES ($1), ($2) RETURNING id::int, nome",
      [nomeProjeto, `${nomeProjeto}-fora`],
    )).rows;
    const [projeto, fora] = projetos;
    const idsProjetos = projetos.map(({ id }) => id);
    t.after(async () => {
      await consultar(
        "DELETE FROM metricas_servico WHERE servico_id IN (SELECT id FROM servicos WHERE aplicacao_id = ANY($1::bigint[]))",
        [idsProjetos],
      );
      await consultar("DELETE FROM servicos WHERE aplicacao_id = ANY($1::bigint[])", [idsProjetos]);
      await consultar("DELETE FROM aplicacoes WHERE id = ANY($1::bigint[])", [idsProjetos]);
    });

    const servicos = (await consultar<{ id: number }>(`
      INSERT INTO servicos (nome, aplicacao_id, regiao_id, status)
      VALUES ('Volume', $1, $3, 'ativo'), ('Pico', $1, $3, 'ativo'), ('Empate', $1, $3, 'ativo'),
        ('Zero', $1, $3, 'ativo'), ('Sem coletas', $1, $3, 'ativo'), ('Carbono', $1, $3, 'ativo'),
        ('Inativo', $1, $3, 'indisponivel'), ('Outro projeto', $2, $4, 'ativo')
      RETURNING id::int
    `, [projeto.id, fora.id, seed.regiao, rVirginiaId])).rows;
    const [volume, pico, empate, zero, semColeta, carbono, inativo] = servicos;
    const inicio = "2026-02-04T00:00:00.000Z";
    const fim = "2026-02-05T00:00:00.000Z";
    await consultar(`
      INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g)
      VALUES
        ($1, '2026-02-03T00:00:00Z', 'sucesso', 4, 40),
        ($1, $8, 'sucesso', 3, 30),
        ($1, $9, 'sucesso', 3, 30),
        ($1, '2026-02-05T00:00:00.001Z', 'sucesso', 300, 300),
        ($2, $8, 'sucesso', 5, 5),
        ($3, $8, 'sucesso', 5, 5),
        ($4, '2026-02-03T12:00:00Z', 'sucesso', 0, NULL),
        ($4, $8, 'sucesso', 0, NULL),
        ($5, $8, 'sem_metricas', 99, 99),
        ($6, $8, 'sucesso', NULL, 100),
        ($7, $8, 'sucesso', 100, 100)
    `, [volume.id, pico.id, empate.id, zero.id, semColeta.id, carbono.id, inativo.id, inicio, fim]);

    const query = new URLSearchParams({ inicio, fim, aplicacaoId: String(projeto.id), metrica: "energia", ordenacao: "DESC" });
    async function obter(mudancas: Record<string, string>) {
      const parametros = new URLSearchParams(query);
      for (const [chave, valor] of Object.entries(mudancas)) parametros.set(chave, valor);
      const resposta = await fetch(`${baseUrl}/analytics/ranking?${parametros}`, { headers: headersAutenticacao });
      const resultado = await resposta.json();
      assert.equal(resposta.status, 200, JSON.stringify(resultado));
      return resultado as RankingDetalhado & { periodo: { inicio: string; fim: string }; agregacao: string };
    }

    const media = await obter({ agregacao: "media" });
    assert.equal(media.agregacao, "media");
    assert.deepEqual(media.periodo, { inicio, fim });
    assert.deepEqual(media.dados.map(({ servicoId }) => servicoId), [pico.id, empate.id, volume.id, zero.id]);
    assert.equal(media.dados[2].tendenciaPercentual, -25);
    assert.equal(media.dados[3].totalEnergiaKwh, 0);
    assert.equal(media.dados[3].totalEmissaoCo2eG, null);
    assert.equal(media.dados[3].tendenciaPercentual, null);
    assert.equal(media.dados[0].tendenciaPercentual, null);
    assert.equal(media.resumo.semDados, 2);
    assert.equal(media.resumo.mediaEnergiaKwh, 3.25);
    assert.equal(media.resumo.menorEnergia?.mediaEnergiaKwh, 0);
    assert.equal(media.resumo.primeiroColocado?.aplicacao, nomeProjeto);
    assert.ok(media.aplicacoes.some(({ id }) => id === fora.id));

    const total = await obter({ agregacao: "total" });
    assert.deepEqual(total.dados.map(({ servicoId }) => servicoId), [volume.id, pico.id, empate.id, zero.id]);
    assert.equal(total.dados[0].tendenciaPercentual, 50);

    const pagina = await obter({ agregacao: "total", limite: "1", offset: "1" });
    assert.deepEqual(pagina.dados, total.dados.slice(1, 2));
    assert.deepEqual(pagina.resumo, total.resumo);

    const emissao = await obter({ metrica: "co2e", agregacao: "media", ordenacao: "ASC" });
    assert.deepEqual(emissao.dados.map(({ servicoId }) => servicoId), [pico.id, empate.id, volume.id, carbono.id]);
    assert.equal(emissao.dados[3].mediaEnergiaKwh, null);

    const vazio = await obter({ agregacao: "media", aplicacaoId: String(fora.id) });
    assert.deepEqual(vazio.dados, []);
    assert.equal(vazio.resumo.semDados, 1);
    assert.equal(vazio.resumo.primeiroColocado, null);
    assert.deepEqual(vazio.aplicacoes, media.aplicacoes);

    const comInativos = await obter({ agregacao: "total", apenasAtivos: "false", regiaoId: String(seed.regiao) });
    assert.equal(comInativos.resumo.primeiroColocado?.servicoId, inativo.id);
    assert.ok(!comInativos.aplicacoes.some(({ id }) => id === fora.id));

    const legado = await obter({});
    assert.equal(Object.hasOwn(legado, "resumo"), false);
    assert.deepEqual(legado.dados.map(({ servicoId }) => servicoId), [volume.id, pico.id, empate.id]);

    const semToken = await fetch(`${baseUrl}/analytics/ranking?${query}&agregacao=media`);
    assert.equal(semToken.status, 401);
    const invalida = await fetch(`${baseUrl}/analytics/ranking?${query}&agregacao=invalida`, { headers: headersAutenticacao });
    assert.equal(invalida.status, 400);
    assert.equal((await invalida.json() as ErrorResponse).error, "invalid_aggregation");
  });

  // ------------------------------------------------------------------
  // 3. Comparação
  // ------------------------------------------------------------------
  await t.test("GET /analytics/comparacao — 2+ serviços com dados", async () => {
    const servicosParam = `${s1.id},${s2.id},${s3.id}`;
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as ComparacaoResponse;
    assert.ok(Array.isArray(body.dados));
    assert.equal(body.dados.length, 3);
    // O service retorna datas com milissegundos (.000Z), normalizar para comparação
    const normalizarPeriodo = (p: { inicio: string; fim: string }) => ({
      inicio: new Date(p.inicio).toISOString(),
      fim: new Date(p.fim).toISOString(),
    });
    assert.deepEqual(normalizarPeriodo(body.periodo), normalizarPeriodo({ inicio, fim }));
    assert.ok(Array.isArray(body.avisos));
    // Verificar totais
    const byNome = Object.fromEntries(body.dados.map((c: any) => [c.nome, c]));
    assert.equal(byNome["Serviço Histórico A"].qtdColetas, 2);
    assert.equal(byNome["Serviço Histórico A"].totalEnergiaKwh, 0.3);
    assert.equal(byNome["Serviço Histórico A"].totalEmissaoCo2eG, 25.5);
    assert.equal(byNome["Serviço Histórico B"].qtdColetas, 1);
    assert.equal(byNome["Serviço Histórico B"].totalEnergiaKwh, 0.05);
    assert.equal(byNome["Serviço Virginia"].qtdColetas, 1);
    assert.equal(byNome["Serviço Virginia"].totalEnergiaKwh, 0.3);
  });

  await t.test("GET /analytics/comparacao — serviço sem dados aparece zerado com aviso", async () => {
    // Criar serviço sem coletas no período
    const sSemDados = await salvarServico({
      idExterno: `${idExterno}-sem-dados`,
      nome: "Serviço Sem Dados",
      aplicacaoId: seed.aplicacao,
      regiaoId: seed.regiao,
      cidade: null, latitude: null, longitude: null,
    });
    const servicosParam = `${s1.id},${sSemDados.id}`;
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as ComparacaoResponse;
    assert.equal(body.dados.length, 2);
    // Deve ter aviso para o serviço sem dados
    assert.ok(body.avisos.length > 0);
    assert.ok(body.avisos[0].includes("Serviço Sem Dados"));
    assert.ok(body.avisos[0].includes("não possui dados de coleta"));
    // Verificar zeros
    const semDados = body.dados.find((c: any) => c.nome === "Serviço Sem Dados")!;
    assert.equal(semDados.totalEnergiaKwh, 0);
    assert.equal(semDados.totalEmissaoCo2eG, 0);
    assert.equal(semDados.qtdColetas, 0);
  });

  await t.test("GET /analytics/comparacao — ordenacao=DESC inverte ordem", async () => {
    const servicosParam = `${s1.id},${s3.id}`;
    const respostaAsc = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}&ordenacao=ASC`, { headers: headersAutenticacao });
    const respostaDesc = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}&ordenacao=DESC`, { headers: headersAutenticacao });
    assert.equal(respostaAsc.status, 200);
    assert.equal(respostaDesc.status, 200);
    const bodyAsc = await respostaAsc.json() as ComparacaoResponse;
    const bodyDesc = await respostaDesc.json() as ComparacaoResponse;
    // ASC mantém ordem dos IDs; DESC inverte
    assert.equal(bodyAsc.dados[0].nome, "Serviço Histórico A");
    assert.equal(bodyDesc.dados[0].nome, "Serviço Virginia");
  });

  await t.test("GET /analytics/comparacao — deduplica IDs", async () => {
    const servicosParam = `${s1.id},${s1.id},${s2.id}`;
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 200);
    const body = await resposta.json() as ComparacaoResponse;
    assert.equal(body.dados.length, 2); // deduplicado
  });

  await t.test("GET /analytics/comparacao — menos de 2 serviços distintos retorna 400", async () => {
    for (const servicosParam of ["", `${s1.id}`, `${s1.id},${s1.id}`]) {
      const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}`, { headers: headersAutenticacao });
      assert.equal(resposta.status, 400, `servicos=${servicosParam}`);
      const body = await resposta.json() as ErrorResponse;
      assert.equal(body.error, "invalid_services");
    }
  });

  await t.test("GET /analytics/comparacao — mais de 5 serviços retorna 400", async () => {
    const extraIds = Array.from({ length: 4 }, (_, i) => 999999 + i).join(",");
    const servicosParam = `${s1.id},${s2.id},${s3.id},${extraIds}`;
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=${servicosParam}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 400);
    const body = await resposta.json() as ErrorResponse;
    assert.equal(body.error, "invalid_services");
    assert.ok(body.message?.includes("máximo 5"));
  });

  await t.test("GET /analytics/comparacao — ID inválido retorna 400", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?${periodoParams}&servicos=abc,${s2.id}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 400);
    const body = await resposta.json() as ErrorResponse;
    assert.equal(body.error, "invalid_services");
  });

  await t.test("GET /analytics/comparacao — período inválido retorna 400", async () => {
    const resposta = await fetch(`${baseUrl}/analytics/comparacao?inicio=2026-11-16T00:00:00Z&fim=2026-11-15T00:00:00Z&servicos=${s1.id},${s2.id}`, { headers: headersAutenticacao });
    assert.equal(resposta.status, 400);
    const body = await resposta.json() as ErrorResponse;
    assert.equal(body.error, "invalid_period");
  });
});
