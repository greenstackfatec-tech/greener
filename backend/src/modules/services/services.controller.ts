import type { IncomingMessage, ServerResponse } from "node:http";
import { responder } from "../../shared/http.ts";
import { listarServicos } from "./services.service.ts";

// O controller cuida do HTTP: recebe a requisição, chama o service e monta a resposta.
// Se o service lançar um erro, o server.ts responde 500 e registra no log.
export async function listar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const servicos = await listarServicos();
  responder(response, 200, servicos);
}