/* Não confundir com o `Servico` de integrations/metrics-api.ts, que é o formato da API externa. */
export interface Servico {
  id: number;
  nome: string;
  status: "ativo" | "indisponivel" | "removido";
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Dados fixos por enquanto (os 3 primeiros serviços do database/seed.sql).
// Quando o banco entrar (BD04), só o corpo de listarServicos() muda.
const servicos: Servico[] = [
  { id: 1, nome: "Billing API", status: "ativo", cidade: "Sao Paulo", latitude: -23.5505, longitude: -46.6333 },
  { id: 2, nome: "Checkout Worker", status: "ativo", cidade: "Ashburn", latitude: 39.0438, longitude: -77.4874 },
  { id: 3, nome: "Recommendation AI", status: "ativo", cidade: "Dublin", latitude: 53.3498, longitude: -6.2603 },
];

// É async desde já: a consulta ao banco será assíncrona, e assim as outras camadas não precisam mudar.
export async function listarServicos(): Promise<Servico[]> {
  return [...servicos];
}