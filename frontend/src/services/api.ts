import { obterToken } from "./token.ts";

/** Comunicação com o backend. Em desenvolvimento o Vite encaminha /api; no container, o Nginx. */
const BASE_URL = "/api";

export interface Prontidao {
  status: string;
  database: string;
}

/** Erro devolvido pelo backend (status HTTP diferente de 2xx). */
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string | null;
  /** Preenchido a partir do cabeçalho Retry-After (o login usa no HTTP 429). */
  readonly tentarNovamenteEmSegundos: number | null;

  constructor(status: number, mensagem: string, codigo: string | null, tentarNovamenteEmSegundos: number | null) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.codigo = codigo;
    this.tentarNovamenteEmSegundos = tentarNovamenteEmSegundos;
  }
}

async function lerCorpo(response: Response): Promise<Record<string, unknown>> {
  try {
    const corpo: unknown = await response.json();
    return typeof corpo === "object" && corpo !== null ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function chamar<T>(caminho: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  // Se o usuário já fez login, toda chamada leva o token (as rotas públicas simplesmente ignoram).
  const token = obterToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${caminho}`, { ...init, headers });
  if (!response.ok) {
    const corpo = await lerCorpo(response);
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new ErroApi(
      response.status,
      typeof corpo.message === "string" ? corpo.message : `HTTP ${response.status}`,
      typeof corpo.error === "string" ? corpo.error : null,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }
  return (await response.json()) as T;
}

/** GET em `/api{caminho}`. */
export function requisitar<T>(caminho: string, signal?: AbortSignal): Promise<T> {
  return chamar<T>(caminho, { signal });
}

/** POST com corpo JSON em `/api{caminho}`. */
export function enviar<T>(caminho: string, corpo: unknown, signal?: AbortSignal): Promise<T> {
  return chamar<T>(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal,
  });
}

export function consultarProntidao(signal?: AbortSignal): Promise<Prontidao> {
  return requisitar<Prontidao>("/health/ready", signal);
}