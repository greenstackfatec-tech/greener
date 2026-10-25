export interface Coleta {
  id: number;
  servicoId: number;
  coletadoEm: string;
  statusColeta: "sucesso" | "sem_metricas" | "indisponivel";
}

// Ainda não há coletas gravadas: o TP07 vai gravá-las e o BD04 vai lê-las do banco.
// Quando o banco entrar, só o corpo de listarColetas() muda.
export async function listarColetas(): Promise<Coleta[]> {
  return [];
}