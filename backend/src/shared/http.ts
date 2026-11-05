import type { IncomingMessage, ServerResponse } from "node:http";

// Uma rota é: método HTTP + caminho + função que trata a requisição.
// Cada módulo (services, collections...) exporta a sua lista de rotas.
export interface Rota {
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  caminho: string;
  tratar: (request: IncomingMessage, response: ServerResponse<IncomingMessage>) => Promise<void>;
}

// Envia qualquer corpo como JSON. Movida do app.ts para os controllers também usarem.
export function responder(
  response: ServerResponse<IncomingMessage>,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}