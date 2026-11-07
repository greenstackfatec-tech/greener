import {
  buscarServicoPorId as buscarServicoPorIdDoRepository,
  listarServicos as listarServicosDoRepository,
} from "./services.repository.ts";
import type { Servico, ServicoComUltimaColeta } from "./services.repository.ts";

export const NAO_INFORMADO = "não informado";

export interface ServicoComLocalizacao extends ServicoComUltimaColeta {
  /** Texto pronto para exibir; latitude e longitude seguem nulas quando faltam (o mapa as omite). */
  localizacao: { pais: string; regiao: string; cidade: string };
}

// O service guarda as regras de negócio: dado ausente de localização é exibido
// como "não informado" (RF12), sem apagar o nulo que o front usa para o mapa (RF13).
export async function listarServicos(): Promise<ServicoComLocalizacao[]> {
  const servicos = await listarServicosDoRepository();
  return servicos.map((servico) => ({
    ...servico,
    localizacao: {
      pais: servico.pais || NAO_INFORMADO,
      regiao: servico.regiao || NAO_INFORMADO,
      cidade: servico.cidade || NAO_INFORMADO,
    },
  }));
}

export async function buscarServico(id: number): Promise<Servico | null> {
  return buscarServicoPorIdDoRepository(id);
}
