import { compare } from "bcryptjs";
import { ErroHttp } from "./auth.http.ts";
import { LimitadorLogin } from "./auth.limiter.ts";
import { buscarUsuarioPorEmail } from "./auth.repository.ts";
import { gerarToken } from "./jwt.ts";

export interface CredenciaisLogin {
  email: string;
  senha: string;
}

export interface LoginAutenticado {
  token: string;
}

// Executar bcrypt mesmo sem usuário reduz diferenças de tempo entre as respostas.
const HASH_COMPARACAO = "$2a$10$DCiS624WhruIu5TMkYr/zu3l7OpPNFVvZFawp5PMBGfZcT84q5Bdm";
const limitadorLogin = new LimitadorLogin();

function validarCredenciais(dados: unknown): CredenciaisLogin {
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) {
    throw new ErroHttp(400, "invalid_request", "Informe e-mail e senha como texto.");
  }
  const { email, senha } = dados as Record<string, unknown>;
  if (
    typeof email !== "string" || email.trim().length > 150
    || !/^[^\s@\u0000-\u001f\u007f]+@[^\s@\u0000-\u001f\u007f]+\.[^\s@\u0000-\u001f\u007f]+$/.test(email.trim())
    || typeof senha !== "string" || senha.length === 0
    || Buffer.byteLength(senha, "utf8") > 72 || senha.includes("\0")
  ) {
    throw new ErroHttp(400, "invalid_request", "Informe um e-mail válido e uma senha de 1 a 72 bytes.");
  }
  // Não remover espaços da senha: eles podem fazer parte da credencial.
  return { email: email.trim(), senha };
}

export async function autenticar(dados: unknown): Promise<LoginAutenticado | null> {
  const { email, senha } = validarCredenciais(dados);
  const concluirTentativa = limitadorLogin.iniciarTentativa(email);
  try {
    const usuario = await buscarUsuarioPorEmail(email);
    const senhaValida = await compare(senha, usuario?.senha_hash ?? HASH_COMPARACAO);
    if (!usuario || !senhaValida) {
      concluirTentativa("falha");
      return null;
    }

    const resultado = { token: await gerarToken(usuario.id) };
    concluirTentativa("sucesso");
    return resultado;
  } catch (erro) {
    concluirTentativa("erro");
    throw erro;
  }
}
