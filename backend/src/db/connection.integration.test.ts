import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import type { Socket } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { TestContext } from "node:test";
import pg from "pg";

function prepararProcesso(t: TestContext, codigo: string, ambiente: NodeJS.ProcessEnv = {}) {
  const processo = spawn(process.execPath, [
    "--experimental-strip-types", "--input-type=module", "--eval",
    `import { consultar, encerrarConexao } from "./src/db/connection.ts"; ${codigo}`,
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, ...ambiente },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  let erros = "";
  processo.stderr!.on("data", (dados) => { erros += dados; });
  t.after(() => {
    if (processo.exitCode === null) processo.kill();
  });
  const fim = once(processo, "exit");
  async function mensagem() {
    const resultado = await Promise.race([
      once(processo, "message", { signal: AbortSignal.timeout(5000) }),
      fim.then(() => { throw new Error(`Processo encerrado antes da recuperação: ${erros.slice(0, 1500)}`); }),
    ]);
    return resultado[0] as {
      pid?: number; erroRegistrado?: boolean; valor?: number; erro?: string; duracaoMs?: number;
    };
  }
  async function aguardarSaida() {
    const [codigo] = await fim;
    assert.equal(codigo, 0, erros.slice(0, 1500));
  }
  return { processo, mensagem, aguardarSaida };
}

test("perder uma conexão ociosa do PostgreSQL não encerra o processo e permite nova consulta", async (t) => {
  const banco = new pg.Client({ connectionTimeoutMillis: 5000 });
  await banco.connect();
  t.after(() => banco.end());
  const { processo, mensagem, aguardarSaida } = prepararProcesso(t, `
    console.error = () => process.send({ erroRegistrado: true });
    process.on("message", async () => {
      try {
        const resultado = await consultar("SELECT 1 AS valor");
        process.send({ valor: resultado.rows[0].valor });
      } catch (erro) {
        process.stderr.write(String(erro));
        process.exitCode = 1;
      } finally {
        await encerrarConexao();
        process.disconnect();
      }
    });
    const resultado = await consultar("SELECT pg_backend_pid() AS pid");
    process.send({ pid: resultado.rows[0].pid });`);
  const { pid } = await mensagem();
  assert.equal(typeof pid, "number");
  const registrada = mensagem();
  await banco.query("SELECT pg_terminate_backend($1)", [pid]);
  assert.equal((await registrada).erroRegistrado, true);
  const recuperada = mensagem();
  processo.send("consultar");
  assert.equal((await recuperada).valor, 1);
  await aguardarSaida();
});

test("consulta que excede o limite falha e a próxima consulta funciona", async (t) => {
  const { mensagem, aguardarSaida } = prepararProcesso(t, `
    const inicio = Date.now();
    let erroConsulta;
    try { await consultar("SELECT pg_sleep(10)"); }
    catch (erro) { erroConsulta = erro.message; }
    const resultado = await consultar("SELECT 1 AS valor");
    process.send({ erro: erroConsulta, valor: resultado.rows[0].valor, duracaoMs: Date.now() - inicio });
    await encerrarConexao();
    process.disconnect();`, { PGQUERY_TIMEOUT_MS: "1000" });
  const resultado = await mensagem();
  assert.match(resultado.erro!, /timeout/i);
  assert.equal(resultado.valor, 1);
  assert.ok(resultado.duracaoMs! < 5000);
  await aguardarSaida();
});

test("conexão com servidor que não conclui o protocolo tem prazo limitado", async (t) => {
  const sockets = new Set<Socket>();
  const servidor = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  t.after(() => {
    for (const socket of sockets) socket.destroy();
    servidor.close();
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const { mensagem, aguardarSaida } = prepararProcesso(t, `
    const inicio = Date.now();
    let erroConexao;
    try { await consultar("SELECT 1"); }
    catch (erro) { erroConexao = erro.message; }
    process.send({ erro: erroConexao, duracaoMs: Date.now() - inicio });
    await encerrarConexao();
    process.disconnect();`, {
    PGHOST: "127.0.0.1", PGPORT: String(endereco.port), PGCONNECT_TIMEOUT: "1",
  });
  const resultado = await mensagem();
  assert.match(resultado.erro!, /timeout/i);
  assert.ok(resultado.duracaoMs! < 5000);
  await aguardarSaida();
});
