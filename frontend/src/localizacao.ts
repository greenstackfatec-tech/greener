/** Texto exibido quando a localização de um serviço não foi informada (RF12). */
export const NAO_INFORMADO = "Não informado";

/** País, região e cidade prontos para exibir: nenhum campo fica vazio. */
export interface LocalizacaoExibida {
  pais: string;
  regiao: string;
  cidade: string;
}

interface DadosDeLocalizacao {
  pais: string | null;
  regiao: string | null;
  cidade: string | null;
}

function textoOuNaoInformado(valor: string | null): string {
  const texto = valor?.trim();
  return texto ? texto : NAO_INFORMADO;
}

/**
 * Localização de exibição (RF12): país, região e cidade quando existem;
 * "Não informado" quando faltam. Os campos do serviço seguem nulos para o mapa (RF13).
 */
export function localizacaoDoServico(servico: DadosDeLocalizacao): LocalizacaoExibida {
  return {
    pais: textoOuNaoInformado(servico.pais),
    regiao: textoOuNaoInformado(servico.regiao),
    cidade: textoOuNaoInformado(servico.cidade),
  };
}
