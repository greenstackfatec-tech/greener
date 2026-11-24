// Ponto de entrada do deploy em serviço único:
// 1. inicializa o banco (só se estiver vazio);
// 2. sobe o backend numa porta interna;
// 3. serve o frontend compilado e repassa /api/* ao backend (o mesmo papel do nginx.conf).
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import { extname, join, normalize } from "node:path";

const PORTA_PUBLICA = Number(process.env.PORT ?? 8080);
const PORTA_BACKEND = 3000;
const PASTA_FRONTEND = "/app/public";
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp", ".jpg": "image/jpeg",
};

await import("./init-db.mjs");

const backend = spawn(process.execPath, ["--experimental-strip-types", "/app/src/server.ts"], {
  env: { ...process.env, PORT: String(PORTA_BACKEND) }, stdio: "inherit",
});
backend.on("exit", (codigo) => {
  console.error(`[deploy] backend encerrou (código ${codigo}); encerrando o container.`);
  process.exit(1);
});
for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => { backend.kill(sinal); process.exit(0); });

async function arquivo(caminho) {
  const destino = normalize(join(PASTA_FRONTEND, caminho));
  if (!destino.startsWith(PASTA_FRONTEND)) return null;
  try { return (await stat(destino)).isFile() ? destino : null; } catch { return null; }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname.startsWith("/api/")) {
    const proxy = http.request({
      host: "127.0.0.1", port: PORTA_BACKEND, method: req.method,
      path: url.pathname.slice(4) + url.search, headers: req.headers,
    }, (resposta) => { res.writeHead(resposta.statusCode ?? 502, resposta.headers); resposta.pipe(res); });
    proxy.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(proxy);
    return;
  }

  let destino = await arquivo(decodeURIComponent(url.pathname));
  if (!destino) {
    if (url.pathname.startsWith("/assets/")) { res.writeHead(404); res.end(); return; }
    destino = join(PASTA_FRONTEND, "index.html"); // rotas do React Router
  }
  const cache = destino.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, { "content-type": TIPOS[extname(destino)] ?? "application/octet-stream", "cache-control": cache });
  createReadStream(destino).pipe(res);
}).listen(PORTA_PUBLICA, () => console.log(`[deploy] GreenER em http://0.0.0.0:${PORTA_PUBLICA}`));
