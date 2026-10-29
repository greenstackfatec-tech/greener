import type { IncomingMessage, ServerResponse } from "node:http";

// Uma rota é: método HTTP + caminho + função que trata a requisição.
// Cada módulo (services, collections...) exporta a sua lista de rotas.
// O caminho aceita parâmetros com ":", ex.: "/services/:id".
export interface Rota {
  metodo: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  caminho: string;
  tratar: (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    parametros: Record<string, string>,
  ) => Promise<void>;
}

// Compara o caminho da rota com o da URL, parte por parte.
// Devolve os parâmetros (ex.: { id: "3" }) ou null se não bater.
export function casarCaminho(caminho: string, pathname: string): Record<string, string> | null {
  const partesRota = caminho.split("/");
  const partesUrl = pathname.split("/");
  if (partesRota.length !== partesUrl.length) return null;

  const parametros: Record<string, string> = {};
  for (let i = 0; i < partesRota.length; i++) {
    if (partesRota[i].startsWith(":")) {
      if (!partesUrl[i]) return null;
      parametros[partesRota[i].slice(1)] = partesUrl[i];
    } else if (partesRota[i] !== partesUrl[i]) {
      return null;
    }
  }
  return parametros;
}

// Converte um id da URL em número; devolve null se não for um inteiro positivo.
export function lerId(valor: string | null | undefined): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return id > 0 && id <= 2147483647 ? id : null;
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