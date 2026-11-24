import pg from "pg";

const timeoutConexaoSegundos = Number(process.env.PGCONNECT_TIMEOUT ?? 5);
const timeoutConsultaMs = Number(process.env.PGQUERY_TIMEOUT_MS ?? 10000);
if (!Number.isInteger(timeoutConexaoSegundos) || timeoutConexaoSegundos < 1 ||
    timeoutConexaoSegundos > Math.floor(2_147_483_647 / 1000)) {
  throw new TypeError("PGCONNECT_TIMEOUT deve ser um inteiro positivo em segundos até 2147483.");
}
if (!Number.isInteger(timeoutConsultaMs) || timeoutConsultaMs < 1 || timeoutConsultaMs > 2_147_483_647) {
  throw new TypeError("PGQUERY_TIMEOUT_MS deve ser um inteiro positivo em milissegundos até 2147483647.");
}

export function criarPool(): pg.Pool {
  const pool = new pg.Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    connectionTimeoutMillis: timeoutConexaoSegundos * 1000,
    query_timeout: timeoutConsultaMs,
    statement_timeout: timeoutConsultaMs,
  });
  pool.on("error", (erro: Error) => {
    console.error("[BANCO] Falha em conexão ociosa; novas consultas poderão reconectar:", erro.message);
  });
  return pool;
}

const pool = criarPool();

export async function consultar<T extends pg.QueryResultRow>(
  sql: string,
  parametros: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, parametros);
}

export async function verificarConexao(): Promise<void> {
  await pool.query("SELECT 1");
}

export async function encerrarConexao(): Promise<void> {
  await pool.end();
}
