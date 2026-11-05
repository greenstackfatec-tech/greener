import type { IncomingMessage, ServerResponse } from "node:http";
import { responder } from "../../shared/http.ts";
import { buscarConfiguracao } from "./monitoring-settings.service.ts";

export async function buscar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const configuracao = await buscarConfiguracao();
  responder(response, 200, configuracao);
}