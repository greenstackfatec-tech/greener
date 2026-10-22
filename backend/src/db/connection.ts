import pg from "pg";

const pool = new pg.Pool();

export async function verificarConexao(): Promise<void> {
  await pool.query("SELECT 1");
}

export async function encerrarConexao(): Promise<void> {
  await pool.end();
}