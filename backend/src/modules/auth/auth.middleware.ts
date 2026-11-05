import { responder } from "../../shared/http.ts";
import type { Rota } from "../../shared/http.ts";
import { verificarToken } from "./jwt.ts";

export function exigirAutenticacao(tratar: Rota["tratar"]): Rota["tratar"] {
  return async (request, response, parametros) => {
    response.setHeader("cache-control", "no-store");
    const authorization = request.headers.authorization;
    const token = authorization && authorization.length <= 4096
      ? /^Bearer +([^\s]+)$/i.exec(authorization)?.[1]
      : undefined;
    if (!token || !(await verificarToken(token))) {
      response.setHeader("www-authenticate", authorization ? 'Bearer error="invalid_token"' : "Bearer");
      responder(response, 401, { error: "unauthorized", message: "Token ausente ou inválido." });
      return;
    }
    await tratar(request, response, parametros);
  };
}
