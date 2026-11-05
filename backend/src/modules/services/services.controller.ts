import type { IncomingMessage, ServerResponse } from "node:http";
import { lerId, responder } from "../../shared/http.ts";
import { buscarServico, listarServicos } from "./services.service.ts";

// O controller cuida do HTTP: recebe a requisição, chama o service e monta a resposta.
// Se o service lançar um erro, o server.ts responde 500 e registra no log.
export async function listar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const servicos = await listarServicos();
  responder(response, 200, servicos);
}

// GET /services/:id
export async function buscar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  parametros: Record<string, string>,
): Promise<void> {
  const id = lerId(parametros.id);
  if (id === null) {
    responder(response, 400, { error: "invalid_id", message: "O id do serviço deve ser um número inteiro positivo." });
    return;
  }

  const servico = await buscarServico(id);
  if (!servico) {
    responder(response, 404, { error: "not_found", message: "Serviço não encontrado." });
    return;
  }
  responder(response, 200, servico);
}
