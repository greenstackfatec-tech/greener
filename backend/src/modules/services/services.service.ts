import {
  buscarServicoPorId as buscarServicoPorIdDoRepository,
  listarServicos as listarServicosDoRepository,
  listarServicosSimples,
} from "./services.repository.ts";
import type { Servico, ServicoComUltimaColeta } from "./services.repository.ts";

export const NAO_INFORMADO = "não informado";

export interface ServicoComLocalizacao extends Servico {
  /** Texto pronto para exibir; latitude e longitude seguem nulas quando faltam (o mapa as omite). */
  localizacao: { pais: string; regiao: string; cidade: string };
}

// O service guarda as regras de negócio: dado ausente de localização é exibido
// como "não informado" (RF12), sem apagar o nulo que o front usa para o mapa (RF13).
export async function listarServicos(): Promise<ServicoComLocalizacao[]> {
  const servicos = await listarServicosSimples();
  return servicos.map((servico) => ({
    ...servico,
    localizacao: {
      pais: servico.pais || NAO_INFORMADO,
      regiao: servico.regiao || NAO_INFORMADO,
      cidade: servico.cidade || NAO_INFORMADO,
    },
  }));
}

// O service guarda as regras de negócio. Por enquanto só repassa ao repository;
// regras como filtrar ou ordenar serviços entram aqui, sem mexer no controller.
export async function listarServicosComUltimaColeta(): Promise<ServicoComUltimaColeta[]> {
  return listarServicosDoRepository();
}

export async function buscarServico(id: number): Promise<Servico | null> {
  return buscarServicoPorIdDoRepository(id);
}
