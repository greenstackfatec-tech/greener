import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

test("migração TP07 preserva o histórico e rejeita associações ambíguas", async (t) => {
  const schema = `tp07_migracao_${randomUUID().replaceAll("-", "")}`;
  const cliente = new pg.Client({ connectionTimeoutMillis: 5000 });
  await cliente.connect();
  t.after(async () => {
    await cliente.query("ROLLBACK");
    await cliente.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cliente.end();
  });
  await cliente.query(`CREATE SCHEMA "${schema}"`);
  await cliente.query(`SET search_path TO "${schema}"`);
  const schemaSql = await readFile(
    new URL("../../../database/schema.sql", import.meta.url),
    "utf8",
  );
  const seedSql = await readFile(new URL("../../../database/seed.sql", import.meta.url), "utf8");
  const migracao = await readFile(
    new URL("../../../database/migrations/001_persistencia_coletas.sql", import.meta.url),
    "utf8",
  );
  const reiniciar = () => cliente.query(schemaSql + seedSql);
  async function rejeitarMigracao(erro: RegExp) {
    await assert.rejects(cliente.query(migracao), erro);
    // O script é transacional; libera a conexão após o erro esperado.
    await cliente.query("ROLLBACK");
  }

  await t.test("seed novo já contém os oito IDs externos", async () => {
    await reiniciar();
    const resultado = await cliente.query("SELECT id_externo FROM servicos ORDER BY id");
    assert.deepEqual(
      resultado.rows.map((r) => r.id_externo),
      [
        "billing-api",
        "checkout-worker",
        "recommendation-ai",
        "inventory-sync",
        "audit-stream",
        "email-dispatcher",
        "fraud-detector",
        "reporting-batch",
      ],
    );
  });

  await t.test(
    "volume antigo mantém IDs, status e coletas; reaplicar não altera os dados",
    async () => {
      await reiniciar();
      const antes = await cliente.query("SELECT id, id_externo, nome FROM servicos ORDER BY id");
      await cliente.query("ALTER TABLE servicos DROP COLUMN id_externo");
      await cliente.query("UPDATE servicos SET status = 'removido' WHERE nome = 'Billing API'");
      await cliente.query(`INSERT INTO metricas_servico (servico_id, intervalo_segundos, status_coleta)
      SELECT id, 60, 'indisponivel' FROM servicos WHERE nome = 'Billing API'`);
      const historico = await cliente.query("SELECT * FROM metricas_servico");
      await cliente.query(migracao);
      await cliente.query(migracao);
      assert.deepEqual(
        (await cliente.query("SELECT id, id_externo, nome FROM servicos ORDER BY id")).rows,
        antes.rows,
      );
      assert.deepEqual(
        (await cliente.query("SELECT * FROM metricas_servico")).rows,
        historico.rows,
      );
      assert.equal(
        (await cliente.query("SELECT status FROM servicos WHERE nome = 'Billing API'")).rows[0]
          .status,
        "removido",
      );
    },
  );

  await t.test(
    "nomes duplicados interrompem a migração inteira, sem vincular parcialmente",
    async () => {
      await reiniciar();
      await cliente.query("UPDATE servicos SET id_externo = NULL");
      await cliente.query(`INSERT INTO servicos (aplicacao_id, regiao_id, nome)
      SELECT aplicacao_id, regiao_id, nome FROM servicos WHERE nome = 'Email Dispatcher'`);
      const antes = await cliente.query("SELECT * FROM servicos ORDER BY id");
      await rejeitarMigracao(/Mapeamento ambíguo.*Email Dispatcher/);
      assert.deepEqual(
        (await cliente.query("SELECT * FROM servicos ORDER BY id")).rows,
        antes.rows,
      );
    },
  );

  await t.test(
    "serviços de outra aplicação não são associados ao seed da demonstração",
    async () => {
      await reiniciar();
      await cliente.query("UPDATE servicos SET id_externo = NULL");
      const aplicacao = await cliente.query(
        "INSERT INTO aplicacoes (nome) VALUES ('Outra aplicação') RETURNING id",
      );
      const outroServico = await cliente.query(
        `INSERT INTO servicos (aplicacao_id, regiao_id, nome, cidade, latitude, longitude)
       SELECT $1, regiao_id, nome, cidade, latitude, longitude
       FROM servicos WHERE nome = 'Billing API'
       RETURNING *`,
        [aplicacao.rows[0].id],
      );

      await cliente.query(migracao);

      assert.deepEqual(
        (await cliente.query("SELECT * FROM servicos WHERE id = $1", [outroServico.rows[0].id]))
          .rows,
        outroServico.rows,
      );
      const associados = await cliente.query(
        `SELECT COUNT(*)::int AS total FROM servicos s
       JOIN aplicacoes a ON a.id = s.aplicacao_id
       WHERE a.nome = 'GreenER Demo' AND s.id_externo IS NOT NULL`,
      );
      assert.equal(associados.rows[0].total, 8);
    },
  );

  await t.test("a migração não recria um serviço removido do banco", async () => {
    await reiniciar();
    await cliente.query("DELETE FROM servicos WHERE id_externo = 'billing-api'");
    await cliente.query("UPDATE servicos SET id_externo = NULL");
    const antes = await cliente.query("SELECT id FROM servicos ORDER BY id");

    await cliente.query(migracao);

    assert.deepEqual((await cliente.query("SELECT id FROM servicos ORDER BY id")).rows, antes.rows);
    assert.equal(antes.rowCount, 7);
    const removido = await cliente.query(
      "SELECT id FROM servicos WHERE id_externo = 'billing-api'",
    );
    assert.equal(removido.rowCount, 0);
  });

  await t.test("ID externo divergente exige revisão manual", async () => {
    await reiniciar();
    await cliente.query("UPDATE servicos SET id_externo = 'outro-id' WHERE nome = 'Billing API'");
    await rejeitarMigracao(/já possui outro ID externo/);
    assert.equal(
      (await cliente.query("SELECT id_externo FROM servicos WHERE nome = 'Billing API'")).rows[0]
        .id_externo,
      "outro-id",
    );
  });

  await t.test("ID externo já vinculado a outro registro exige revisão manual", async () => {
    await reiniciar();
    await cliente.query("UPDATE servicos SET id_externo = NULL WHERE nome = 'Billing API'");
    await cliente.query(`INSERT INTO servicos (id_externo, aplicacao_id, regiao_id, nome)
      SELECT 'billing-api', aplicacao_id, regiao_id, 'Outro serviço' FROM servicos WHERE nome = 'Billing API'`);
    await rejeitarMigracao(/já pertence a outro registro/);
    assert.equal(
      (await cliente.query("SELECT id_externo FROM servicos WHERE nome = 'Billing API'")).rows[0]
        .id_externo,
      null,
    );
  });

  await t.test("a localização também precisa corresponder ao seed legado conhecido", async () => {
    await reiniciar();
    await cliente.query(
      "UPDATE servicos SET id_externo = NULL, cidade = 'Outra cidade' WHERE nome = 'Billing API'",
    );
    await rejeitarMigracao(/Localização.*difere do seed conhecido/);
  });

  await t.test(
    "aceita intervalo zero sem alterar exigências de metadados das regiões",
    async () => {
      await reiniciar();
      await cliente.query(`ALTER TABLE regioes ALTER COLUMN fator_co2e_g_kwh SET NOT NULL;
      ALTER TABLE regioes ALTER COLUMN ano_referencia SET NOT NULL;
      ALTER TABLE metricas_servico DROP CONSTRAINT metricas_servico_intervalo_segundos_check;
      ALTER TABLE metricas_servico ADD CONSTRAINT metricas_servico_intervalo_segundos_check CHECK (intervalo_segundos > 0)`);
      const antes = await cliente.query("SELECT * FROM regioes ORDER BY id");
      await cliente.query(migracao);
      assert.deepEqual((await cliente.query("SELECT * FROM regioes ORDER BY id")).rows, antes.rows);
      await assert.rejects(
        cliente.query("INSERT INTO regioes (nome, pais) VALUES ('Sem fator', 'Brazil')"),
      );
      await assert.rejects(
        cliente.query(
          "INSERT INTO regioes (nome, pais, fator_co2e_g_kwh) VALUES ('Inválida', 'Brazil', -1)",
        ),
      );
      await assert.rejects(
        cliente.query(
          "INSERT INTO regioes (nome, pais, ano_referencia) VALUES ('Inválida', 'Brazil', 1999)",
        ),
      );
      await cliente.query(`INSERT INTO metricas_servico (servico_id, intervalo_segundos, status_coleta)
      SELECT id, 0, 'sucesso' FROM servicos WHERE nome = 'Billing API'`);
      await assert.rejects(
        cliente.query(`INSERT INTO metricas_servico (servico_id, intervalo_segundos, status_coleta)
      SELECT id, -1, 'sucesso' FROM servicos WHERE nome = 'Billing API'`),
      );
    },
  );
});
