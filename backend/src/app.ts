import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { verificarConexao } from "./db/connection.ts";
import { rotasColetas } from "./modules/coletas/coletas.controller.ts";

function responder(
  response: ServerResponse<IncomingMessage>,
  status: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export async function tratarRequisicao(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = url.pathname;
  const method = request.method ?? "GET";

  // Health checks
  if (method === "GET" && pathname === "/health/live") {
    responder(response, 200, { status: "ok" });
    return;
  }

  if (method === "GET" && pathname === "/health/ready") {
    try {
      await verificarConexao();
      responder(response, 200, { status: "ok", database: "connected" });
    } catch (erro) {
      console.error("Verificação de prontidão do banco de dados falhou:", erro);
      responder(response, 503, { status: "not_ready", database: "unavailable" });
    }
    return;
  }

  // Rotas de coletas
  const rotasMetodo = rotasColetas[method];
  if (rotasMetodo && rotasMetodo[pathname]) {
    await rotasMetodo[pathname](request, response);
    return;
  }

  responder(response, 404, { error: "not_found" });
}