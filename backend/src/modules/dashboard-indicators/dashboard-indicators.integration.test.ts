import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import pg from "pg";

test("GET /dashboard/indicadores calcula os totais com PostgreSQL real", async (t) => {
  const schema = `indicadores_${randomUUID().replaceAll("-", "")}`;
  const administrador = new pg.Pool({ connectionTimeoutMillis: 5000 });
  await administrador.query(`CREATE SCHEMA "${schema}"`);
  const banco = new pg.Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
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
  await banco.query(await readFile(new URL("../../../../database/schema.sql", import.meta.url), "utf8"));
  const { tratarRequisicao } = await import("../../app.ts");
  const { encerrarConexao } = await import("../../db/connection.ts");
  const { encerrarPool } = await import("./dashboard-indicators.repository.ts");
  encerramentos.push(encerrarConexao, encerrarPool);
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  t.after(() => {
    servidor.close();
    servidor.closeAllConnections();
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;
  async function indicadores() {
    const resposta = await fetch(`${baseUrl}/dashboard/indicadores`);
    assert.equal(resposta.status, 200, await resposta.clone().text());
    assert.match(resposta.headers.get("content-type") ?? "", /application\/json/);
    return resposta.json();
  }

  await t.test("banco sem serviços retorna HTTP 200 com os quatro indicadores zerados", async () => {
    assert.deepEqual(await indicadores(), {
      consumo_total_kwh: 0, emissao_total_co2e_g: 0,
      servicos_ativos: 0, servicos_indisponiveis: 0,
    });
  });

  const aplicacao = await banco.query("INSERT INTO aplicacoes (nome) VALUES ('Teste indicadores') RETURNING id");
  const regiao = await banco.query(
    "INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia) VALUES ('Teste', 'Brazil', 100, 2026) RETURNING id",
  );
  const servicos = await banco.query<{ id: string }>(
    `INSERT INTO servicos (aplicacao_id, regiao_id, nome, status) VALUES
       ($1, $2, 'Ativo 1', 'ativo'), ($1, $2, 'Ativo 2', 'ativo'),
       ($1, $2, 'Indisponível', 'indisponivel'), ($1, $2, 'Removido', 'removido')
     RETURNING id`,
    [aplicacao.rows[0].id, regiao.rows[0].id],
  );
  const [primeiro, segundo, indisponivel] = servicos.rows.map((servico) => servico.id);

  await t.test("serviços sem coletas mantêm as contagens e retornam totais zerados", async () => {
    assert.deepEqual(await indicadores(), {
      consumo_total_kwh: 0, emissao_total_co2e_g: 0,
      servicos_ativos: 2, servicos_indisponiveis: 1,
    });
  });

  await t.test("soma somente a última coleta bem-sucedida com cálculo de cada serviço", async () => {
    await banco.query(
      `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g) VALUES
         ($1, '2026-11-01T10:00:00Z', 'sucesso', 999, 999),
         ($1, '2026-11-01T10:01:00Z', 'sucesso', 0.12345678, 0.5),
         ($1, '2026-11-01T10:02:00Z', 'sucesso', NULL, NULL),
         ($2, '2026-11-01T10:01:00Z', 'sucesso', 0.2, 0.75),
         ($2, '2026-11-01T10:02:00Z', 'sem_metricas', NULL, NULL),
         ($3, '2026-11-01T10:02:00Z', 'indisponivel', NULL, NULL)`,
      [primeiro, segundo, indisponivel],
    );
    assert.deepEqual(await indicadores(), {
      consumo_total_kwh: 0.32345678, emissao_total_co2e_g: 1.25,
      servicos_ativos: 2, servicos_indisponiveis: 1,
    });
  });

  await t.test("nova coleta substitui a anterior nos totais sem somar todo o histórico", async () => {
    await banco.query(
      `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g)
       VALUES ($1, '2026-11-01T10:03:00Z', 'sucesso', 0.4, 1)`,
      [primeiro],
    );
    assert.deepEqual(await indicadores(), {
      consumo_total_kwh: 0.6, emissao_total_co2e_g: 1.75,
      servicos_ativos: 2, servicos_indisponiveis: 1,
    });
  });

  await t.test("coletas no mesmo horário usam o maior ID para desempatar", async () => {
    await banco.query(
      `INSERT INTO metricas_servico (servico_id, coletado_em, status_coleta, energia_kwh, emissao_co2e_g)
       VALUES ($1, '2026-11-01T10:03:00Z', 'sucesso', 0.6, 1.5)`,
      [primeiro],
    );
    assert.deepEqual(await indicadores(), {
      consumo_total_kwh: 0.8, emissao_total_co2e_g: 2.25,
      servicos_ativos: 2, servicos_indisponiveis: 1,
    });
  });

  await t.test("falha real de consulta retorna HTTP 500 sem expor detalhes do banco", async (t) => {
    t.mock.method(console, "error", () => {});
    await banco.query("ALTER TABLE metricas_servico RENAME TO metricas_servico_teste");
    try {
      const resposta = await fetch(`${baseUrl}/dashboard/indicadores`);
      assert.equal(resposta.status, 500);
      assert.deepEqual(await resposta.json(), { error: "internal_error" });
    } finally {
      await banco.query("ALTER TABLE metricas_servico_teste RENAME TO metricas_servico");
    }
  });

  await t.test("retorna 404 para caminho inexistente", async () => {
    const resposta = await fetch(`${baseUrl}/dashboard/nao-existe`);
    assert.equal(resposta.status, 404);
  });
});
