import { useCallback, useEffect, useRef, useState } from "react";
import { ErroApi } from "../services/api.ts";
import { listarServicos, type Servico } from "../services/servicos.ts";

export interface EstadoServicos {
  /** null enquanto nunca houve uma resposta válida. Depois disso, guarda sempre os últimos dados válidos (RNF04). */
  servicos: Servico[] | null;
  /** Primeira carga, ainda sem dados para mostrar. */
  carregando: boolean;
  /** Nova consulta em andamento com dados já na tela. */
  atualizando: boolean;
  /** Mensagem da última consulta que falhou; null se a última deu certo. */
  erro: string | null;
  /** Momento (ms) da última consulta bem-sucedida. */
  atualizadoEm: number | null;
}

function mensagemDeErro(falha: unknown): string {
  if (falha instanceof ErroApi) return `O servidor respondeu com erro (HTTP ${falha.status}).`;
  if (falha instanceof TypeError) return "Sem conexão com o servidor.";
  return "Não foi possível ler a resposta do servidor.";
}

/**
 * Carrega os serviços e os atualiza sozinho a cada `intervaloMs` (RF11).
 * Falhas não param o ciclo: a próxima tentativa acontece no intervalo seguinte.
 * Só o que vem do backend muda; busca, filtro e visão ficam como o usuário deixou.
 */
export function useServicos(intervaloMs: number) {
  const [estado, setEstado] = useState<EstadoServicos>({
    servicos: null,
    carregando: true,
    atualizando: false,
    erro: null,
    atualizadoEm: null,
  });
  const consultaAtual = useRef<AbortController | null>(null);
  const emCurso = useRef(false);

  const consultar = useCallback(async () => {
    consultaAtual.current?.abort();
    const controle = new AbortController();
    consultaAtual.current = controle;
    emCurso.current = true;

    try {
      const servicos = await listarServicos(controle.signal);
      if (controle.signal.aborted) return;
      setEstado({ servicos, carregando: false, atualizando: false, erro: null, atualizadoEm: Date.now() });
    } catch (falha) {
      if (controle.signal.aborted) return;
      // Mantém os últimos dados válidos: a tela os marca como possivelmente desatualizados.
      setEstado((anterior) => ({ ...anterior, carregando: false, atualizando: false, erro: mensagemDeErro(falha) }));
    } finally {
      // Uma consulta mais nova pode ter substituído esta; só a atual libera o ciclo.
      if (consultaAtual.current === controle) emCurso.current = false;
    }
  }, []);

  /** Botão "Atualizar dados" e "Tentar de novo". */
  const recarregar = useCallback(() => {
    setEstado((anterior) => ({
      ...anterior,
      carregando: anterior.servicos === null,
      atualizando: anterior.servicos !== null,
      erro: null,
    }));
    void consultar();
  }, [consultar]);

  useEffect(() => {
    void consultar();
    return () => consultaAtual.current?.abort();
  }, [consultar]);

  // Atualização automática: pula o ciclo se ainda há consulta em andamento ou a aba está oculta.
  useEffect(() => {
    const atualizarSeLivre = () => {
      if (!document.hidden && !emCurso.current) void consultar();
    };
    const id = setInterval(atualizarSeLivre, intervaloMs);
    // Ao voltar para a aba, atualiza logo em vez de esperar o próximo ciclo.
    document.addEventListener("visibilitychange", atualizarSeLivre);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizarSeLivre);
    };
  }, [consultar, intervaloMs]);

  return { ...estado, recarregar };
}
