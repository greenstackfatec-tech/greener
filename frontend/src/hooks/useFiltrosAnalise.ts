import { useCallback, useEffect, useState } from "react";
import { FILTROS_PADRAO, type FiltrosAnalise } from "../filtros.ts";

const CHAVE = "greener:filtros-analise";

function lerSalvos(): FiltrosAnalise {
  try {
    const salvo = sessionStorage.getItem(CHAVE);
    return salvo ? { ...FILTROS_PADRAO, ...JSON.parse(salvo) } : FILTROS_PADRAO;
  } catch {
    return FILTROS_PADRAO;
  }
}

/**
 * Filtros de serviço, região e período (DW14). Ficam no estado da tela, então a
 * atualização automática não os toca (RF11), e na sessionStorage, para valerem
 * também no histórico, no ranking e na comparação e sobreviverem a um F5.
 */
export function useFiltrosAnalise() {
  const [filtros, setFiltros] = useState<FiltrosAnalise>(lerSalvos);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(filtros));
    } catch {
      // Sem armazenamento (aba privada, bloqueio): os filtros seguem valendo nesta tela.
    }
  }, [filtros]);

  const alterar = useCallback((mudanca: Partial<FiltrosAnalise>) => {
    setFiltros((anteriores) => ({ ...anteriores, ...mudanca }));
  }, []);

  const limpar = useCallback(() => setFiltros(FILTROS_PADRAO), []);

  return { filtros, alterar, limpar };
}
