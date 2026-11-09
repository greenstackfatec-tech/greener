import { useCallback, useEffect, useRef, useState } from "react";
import { consultarIndicadores, type Indicadores } from "../services/indicadores.ts";

export type EstadoIndicadores =
  | { tipo: "carregando" }
  | { tipo: "ok"; dados: Indicadores }
  /** `dadosAnteriores` guarda a última resposta válida, se houve alguma (RNF04). */
  | { tipo: "erro"; dadosAnteriores: Indicadores | null };

/** Últimos dados válidos de um estado, ou null se nunca houve resposta válida. */
function dadosDe(estado: EstadoIndicadores): Indicadores | null {
  if (estado.tipo === "ok") return estado.dados;
  if (estado.tipo === "erro") return estado.dadosAnteriores;
  return null;
}

/**
 * Consulta os indicadores consolidados (GET /dashboard/indicadores).
 *
 * Sem argumento, consulta uma vez (é assim que o painel da tela de login usa).
 * Com `intervaloMs`, repete a consulta sozinho nesse intervalo, como o `useServicos`.
 * Se uma consulta falha depois de já ter dados, o estado vira "erro" mas
 * `dadosAnteriores` preserva os últimos valores, para a tela poder avisar que
 * eles podem estar desatualizados em vez de apagá-los.
 */
export function useIndicadores(intervaloMs?: number): EstadoIndicadores & { recarregar: () => void } {
  const [estado, setEstado] = useState<EstadoIndicadores>({ tipo: "carregando" });
  const consultaAtual = useRef<AbortController | null>(null);
  const emCurso = useRef(false);

  const consultar = useCallback(async () => {
    consultaAtual.current?.abort();
    const controle = new AbortController();
    consultaAtual.current = controle;
    emCurso.current = true;

    try {
      const dados = await consultarIndicadores(controle.signal);
      if (controle.signal.aborted) return;
      setEstado({ tipo: "ok", dados });
    } catch {
      if (controle.signal.aborted) return;
      setEstado((anterior) => ({ tipo: "erro", dadosAnteriores: dadosDe(anterior) }));
    } finally {
      // Uma consulta mais nova pode ter substituído esta; só a atual libera o ciclo.
      if (consultaAtual.current === controle) emCurso.current = false;
    }
  }, []);

  /** "Atualizar dados" e "Tentar de novo". */
  const recarregar = useCallback(() => {
    // Sem dados para mostrar volta a "carregando"; com dados, mantém os valores até a resposta chegar.
    setEstado((anterior) => {
      const dados = dadosDe(anterior);
      return dados === null ? { tipo: "carregando" } : { tipo: "ok", dados };
    });
    void consultar();
  }, [consultar]);

  useEffect(() => {
    let ativo = true;
    queueMicrotask(() => {
      if (ativo) void consultar();
    });
    return () => {
      ativo = false;
      consultaAtual.current?.abort();
    };
  }, [consultar]);

  // Atualização automática (só se `intervaloMs` foi informado): pula o ciclo se ainda há
  // consulta em andamento ou a aba está oculta, e atualiza logo ao voltar para a aba.
  useEffect(() => {
    if (intervaloMs === undefined) return;
    const atualizarSeLivre = () => {
      if (!document.hidden && !emCurso.current) void consultar();
    };
    const id = setInterval(atualizarSeLivre, intervaloMs);
    document.addEventListener("visibilitychange", atualizarSeLivre);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizarSeLivre);
    };
  }, [consultar, intervaloMs]);

  return { ...estado, recarregar };
}
