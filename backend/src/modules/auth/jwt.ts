import { errors, jwtVerify, SignJWT } from "jose";

const EMISSOR = "greener-backend";
const AUDIENCIA = "greener";
const ID_USUARIO = /^[1-9]\d{0,18}$/;
const VALIDADE_SEGUNDOS = 3600;

export function lerConfiguracaoJwt(ambiente: NodeJS.ProcessEnv = process.env): {
  chave: Uint8Array;
} {
  const segredo = ambiente.JWT_SECRET;
  if (!segredo?.trim() || Buffer.byteLength(segredo, "utf8") < 32) {
    throw new TypeError("JWT_SECRET deve conter pelo menos 32 bytes e ser gerado aleatoriamente.");
  }
  return { chave: new TextEncoder().encode(segredo) };
}

export async function gerarToken(usuarioId: string): Promise<string> {
  if (!ID_USUARIO.test(usuarioId)) throw new TypeError("Identificador de usuário inválido.");
  const { chave } = lerConfiguracaoJwt();
  const agora = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(usuarioId)
    .setIssuer(EMISSOR)
    .setAudience(AUDIENCIA)
    .setIssuedAt(agora)
    .setExpirationTime(agora + VALIDADE_SEGUNDOS)
    .sign(chave);
}

export async function verificarToken(token: string): Promise<string | null> {
  const { chave } = lerConfiguracaoJwt();
  try {
    const { payload } = await jwtVerify(token, chave, {
      algorithms: ["HS256"],
      typ: "JWT",
      issuer: EMISSOR,
      audience: AUDIENCIA,
      requiredClaims: ["sub", "iat", "exp"],
      maxTokenAge: VALIDADE_SEGUNDOS,
    });
    return typeof payload.sub === "string" && ID_USUARIO.test(payload.sub) ? payload.sub : null;
  } catch (erro) {
    if (erro instanceof errors.JOSEError) return null;
    throw erro;
  }
}
