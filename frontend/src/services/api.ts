/** Comunicação com o backend. Em desenvolvimento o Vite encaminha /api; no container, o Nginx. */
const BASE_URL = "/api";

export interface Prontidao {
  status: string;
  database: string;
}

export async function requisitar<T>(caminho: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${caminho}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function consultarProntidao(signal?: AbortSignal): Promise<Prontidao> {
  return requisitar<Prontidao>("/health/ready", signal);
}
