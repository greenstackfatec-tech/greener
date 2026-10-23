import type { IncomingMessage, ServerResponse } from "node:http";
import { responder } from "../../shared/http.ts";
import { listarColetas } from "./collections.service.ts";

export async function listar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const coletas = await listarColetas();
  responder(response, 200, coletas);
}