import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { TestContext } from "node:test";

async function preparar(t: TestContext, automatico?: string) {
  let listagens = 0;
  const api = createServer((_request, response) => {
    listagens++;
    response.writeHead(200, { "content-type": "application/json" });
    response.end("[]");
  });
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const enderecoMock = api.address();
  assert.ok(enderecoMock && typeof enderecoMock !== "string");
  const reserva = createServer();
  await new Promise<void>((resolve) => reserva.listen(0, "127.0.0.1", resolve));
  const endereco = reserva.address();
  assert.ok(endereco && typeof endereco !== "string");
  await new Promise<void>((resolve) => reserva.close(() => resolve()));
  const ambiente = {
    ...process.env,
    PORT: String(endereco.port),
    METRICS_API_URL: `http://127.0.0.1:${enderecoMock.port}`,
    COLLECTIONS_AUTO_START: automatico,
  };
  // A mensagem aciona o mesmo handler de SIGTERM também no Windows.
  const processo = spawn(process.execPath, [
    "--experimental-strip-types", "--input-type=module", "--eval",
    `import pg from "pg";
     pg.Pool.prototype.query = async () => ({ rows: [{ valor: "60" }] });
     await import("./src/server.ts");
     process.on("message", () => { process.emit("SIGTERM"); process.disconnect(); });`,
  ], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: ambiente,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let saida = "";
  processo.stdout!.on("data", (dados) => { saida += dados; });
  processo.stderr!.on("data", (dados) => { saida += dados; });
  t.after(() => {
    if (processo.exitCode === null) processo.kill();
    api.close();
    api.closeAllConnections();
  });
  const base = `http://127.0.0.1:${endereco.port}`;
  const limite = Date.now() + 5000;
  while (true) {
    try {
      const resposta = await fetch(`${base}/health/live`, { signal: AbortSignal.timeout(1000) });
      if (resposta.ok) break;
    } catch {}
    assert.ok(Date.now() < limite, saida || "Servidor não iniciou");
    await setTimeout(10);
  }
  const status = async () => (await (await fetch(`${base}/collections/rotina/status`)).json()) as {
    dados: { executando: boolean; encerrando: boolean; intervaloAlternativoSegundos: number };
  };
  const iniciar = (body = "{}") => fetch(`${base}/collections/rotina/iniciar`, {
    method: "POST", headers: { "content-type": "application/json" }, body,
  });
  const parar = () => fetch(`${base}/collections/rotina/parar`, { method: "POST" });
  async function encerrar() {
    const fim = once(processo, "exit", { signal: AbortSignal.timeout(5000) });
    processo.send("SIGTERM");
    const [codigo] = await fim;
    assert.equal(codigo, 0, saida);
  }
  return { status, iniciar, parar, encerrar, listagens: () => listagens };
}

test("TP06 servidor inicia a rotina por padrão, compartilha status/controle e encerra sem timers", async (t) => {
  const app = await preparar(t);
  assert.equal((await app.status()).dados.executando, true);
  assert.equal((await app.iniciar()).status, 400);
  assert.equal((await app.parar()).status, 200);
  assert.equal((await app.status()).dados.executando, false);
  const simultaneas = await Promise.all([app.iniciar(), app.iniciar()]);
  assert.deepEqual(simultaneas.map((r) => r.status).sort(), [200, 400]);
  assert.ok(app.listagens() >= 1);
  await app.encerrar();
});

test("ambiente isolado pode desativar início automático e validar intervalo alternativo pelo HTTP", async (t) => {
  const app = await preparar(t, "false");
  assert.equal((await app.status()).dados.executando, false);
  assert.equal(app.listagens(), 0);
  for (const body of ["null", "[]", "{", '{"intervaloSegundos":0}', '{"intervaloSegundos":2147484}', '{"intervaloSegundos":"30"}']) {
    assert.equal((await app.iniciar(body)).status, 400);
  }
  const inicio = await app.iniciar('{"intervaloSegundos":1}');
  assert.equal(inicio.status, 200);
  const dados = (await inicio.json()) as {
    dados: { intervaloSegundos: number; intervaloAlternativoSegundos: number };
  };
  assert.equal(dados.dados.intervaloSegundos, 1);
  assert.equal(dados.dados.intervaloSegundos, dados.dados.intervaloAlternativoSegundos);
  assert.equal((await app.status()).dados.intervaloAlternativoSegundos, 1);
  assert.equal((await app.parar()).status, 200);
  await app.encerrar();
});
