// Cria o schema e o seed apenas quando o banco ainda está vazio.
// schema.sql apaga as tabelas, por isso nunca roda num banco que já tem dados.
import { readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client();
await client.connect();
try {
  const { rows } = await client.query("SELECT to_regclass('public.usuarios') AS tabela");
  if (rows[0].tabela) {
    console.log("[init-db] Banco já inicializado; nada a fazer.");
  } else {
    for (const arquivo of ["schema.sql", "seed.sql"]) {
      console.log(`[init-db] Aplicando ${arquivo}...`);
      await client.query(await readFile(new URL(`../database/${arquivo}`, import.meta.url), "utf8"));
    }
    console.log("[init-db] Banco inicializado.");
  }
} finally {
  await client.end();
}
