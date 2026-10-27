import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { verificarConexao } from "./db/connection.ts";
import { rotasServices } from "./modules/services/services.routes.ts";
import { rotasCollections } from "./modules/collections/collections.routes.ts";
import { rotasMonitoringSettings } from "./modules/monitoring-settings/monitoring-settings.routes.ts";
import { responder } from "./shared/http.ts";
import type { Rota } from "./shared/http.ts";

// Cada módulo entrega a sua lista de rotas; o app só junta todas.
const rotas: Rota[] = [...rotasServices, ...rotasCollections, ...rotasMonitoringSettings];

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

  const rota = rotas.find((candidata) => candidata.metodo === request.method && candidata.caminho === pathname);
  if (rota) {
    await rota.tratar(request, response);
    return;
  }

  responder(response, 404, { error: "not_found" });
}