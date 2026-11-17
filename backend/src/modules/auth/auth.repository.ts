import { consultar } from "../../db/connection.ts";
import { ErroHttp } from "./auth.http.ts";

export interface UsuarioAutenticacao {
  // BIGSERIAL pode ultrapassar a precisão de number no JavaScript.
  id: string;
  senha_hash: string;
}

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioAutenticacao | null> {
  const resultado = await consultar<UsuarioAutenticacao>(
    "SELECT id::text, senha_hash FROM usuarios WHERE email = $1",
    [email],
  );
  return resultado.rows[0] ?? null;
}

export async function criarUsuario(nome: string, email: string, senhaHash: string): Promise<{ id: string }> {
  try {
    const resultado = await consultar<{ id: string }>(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id::text",
      [nome, email, senhaHash],
    );
    return resultado.rows[0];
  } catch (erro) {
    if (typeof erro === "object" && erro !== null
      && "code" in erro && erro.code === "23505"
      && "constraint" in erro && erro.constraint === "usuarios_email_key") {
      throw new ErroHttp(409, "email_already_exists", "Este e-mail já está cadastrado.");
    }
    throw erro;
  }
}
