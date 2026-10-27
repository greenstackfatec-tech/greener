import { consultar } from "../../db/connection.ts";

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
