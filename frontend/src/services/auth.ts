import { enviar } from "./api.ts";
import { salvarToken } from "./token.ts";

interface RespostaLogin {
  token: string;
}

/**
 * Faz o login (POST /auth/login) e guarda o token JWT.
 * Lança `ErroApi` quando o backend recusa (401 credenciais inválidas, 429 muitas tentativas...).
 */
export async function entrar(email: string, senha: string, lembrar: boolean): Promise<void> {
  const resposta = await enviar<RespostaLogin>("/auth/login", { email: email.trim(), senha });
  if (typeof resposta.token !== "string" || resposta.token === "") {
    throw new Error("Resposta de login sem token.");
  }
  salvarToken(resposta.token, lembrar);
}