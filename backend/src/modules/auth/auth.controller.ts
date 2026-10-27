import { responder } from "../../shared/http.ts";
import type { Rota } from "../../shared/http.ts";
import { ErroHttp, lerJson } from "./auth.http.ts";
import { ErroLimiteLogin } from "./auth.limiter.ts";
import { autenticar } from "./auth.service.ts";

export const login: Rota["tratar"] = async (request, response) => {
  response.setHeader("cache-control", "no-store");
  try {
    const resultado = await autenticar(await lerJson(request));
    if (!resultado) {
      responder(response, 401, { error: "invalid_credentials", message: "E-mail ou senha inválidos." });
      return;
    }
    responder(response, 200, resultado);
  } catch (erro) {
    if (!(erro instanceof ErroHttp)) throw erro;
    if (erro instanceof ErroLimiteLogin) {
      response.setHeader("retry-after", erro.tentarNovamenteEmSegundos);
    }
    responder(response, erro.status, { error: erro.codigo, message: erro.message });
  }
};
