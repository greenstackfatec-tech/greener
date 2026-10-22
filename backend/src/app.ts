import type { IncomingMessage, ServerResponse } from "node:http";
import { verificarConexao } from "./db/connection.ts";

function responder(
  response: ServerResponse<IncomingMessage>,
  status: number,
  body: Record<string, string>,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export async function tratarRequisicao(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (request.method === "GET" && pathname === "/health/live") {
    responder(response, 200, { status: "ok" });
    return;
  }

  if (request.method === "GET" && pathname === "/health/ready") {
    try {
      await verificarConexao();
      responder(response, 200, { status: "ok", database: "connected" });
    } catch (erro) {
      console.error("Verificação de prontidão do banco de dados falhou:", erro);
      responder(response, 503, { status: "not_ready", database: "unavailable" });
    }
    return;
  }

  responder(response, 404, { error: "not_found" });
}