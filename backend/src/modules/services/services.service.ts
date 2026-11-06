import type { Servico, ServicoComUltimaColeta } from "./services.repository.ts";
import {
  buscarServicoPorId as buscarServicoPorIdDoRepository,
  listarServicos as listarServicosDoRepository,
} from "./services.repository.ts";
import { montarLocalizacao } from "./services.localizacao.ts";
import type { LocalizacaoExibida } from "./services.localizacao.ts";

export { NAO_INFORMADO } from "./services.localizacao.ts";

export interface ServicoComLocalizacao extends ServicoComUltimaColeta {
  /** Texto pronto para exibir; latitude e longitude seguem nulas quando faltam (o mapa as omite). */
  localizacao: LocalizacaoExibida;
}

// O service guarda as regras de negócio: dado ausente de localização é exibido
// como "Não informado" (RF12), sem apagar o nulo que o front usa para o mapa (RF13).
export async function listarServicos(): Promise<ServicoComLocalizacao[]> {
  const servicos = await listarServicosDoRepository();
  return servicos.map((servico) => ({
    ...servico,
    localizacao: montarLocalizacao(servico),
  }));
}

export async function buscarServico(id: number): Promise<Servico | null> {
  return buscarServicoPorIdDoRepository(id);
}
