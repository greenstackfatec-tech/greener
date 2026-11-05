import { listarServicos as listarServicosDoRepository } from "./services.repository.ts";
import type { ServicoComUltimaColeta } from "./services.repository.ts";

// O service guarda as regras de negócio. Por enquanto só repassa a lista;
// regras como filtrar ou ordenar serviços entram aqui, sem mexer no controller.
export async function listarServicos(): Promise<ServicoComUltimaColeta[]> {
  return listarServicosDoRepository();
}