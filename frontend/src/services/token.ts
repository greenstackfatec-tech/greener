/**
 * Guarda o token JWT no navegador.
 * - "Lembrar de mim" marcado  -> localStorage (sobrevive ao fechar o navegador)
 * - "Lembrar de mim" desmarcado -> sessionStorage (some ao fechar a aba)
 */
const CHAVE = "greener.token";

/** Lê o campo `exp` (segundos) do payload do JWT. Não valida a assinatura: quem valida é o backend. */
function lerExpiracao(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export function removerToken(): void {
  try {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Armazenamento bloqueado pelo navegador: não há o que remover.
  }
}

export function salvarToken(token: string, lembrar: boolean): void {
  removerToken();
  try {
    (lembrar ? localStorage : sessionStorage).setItem(CHAVE, token);
  } catch {
    // Sem armazenamento disponível, o login vale só até recarregar a página.
  }
}

/** Devolve o token salvo ou `null` se não existir ou já tiver expirado (o backend emite tokens de 1 hora). */
export function obterToken(): string | null {
  try {
    const token = sessionStorage.getItem(CHAVE) ?? localStorage.getItem(CHAVE);
    if (!token) return null;
    const expiracao = lerExpiracao(token);
    if (expiracao === null || expiracao * 1000 <= Date.now()) {
      removerToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}