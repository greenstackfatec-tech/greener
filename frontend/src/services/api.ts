/** Comunicação com o backend. Em desenvolvimento o Vite encaminha /api; no container, o Nginx. */
const BASE_URL = "/api";

export interface Prontidao {
  status: string;
  database: string;
}

export async function consultarProntidao(signal?: AbortSignal): Promise<Prontidao> {
  const response = await fetch(`${BASE_URL}/health/ready`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as Prontidao;
}
