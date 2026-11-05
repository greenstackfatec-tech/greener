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

export function useServicos() {
  const [estado, setEstado] = useState<EstadoServicos>({
    servicos: null,
    carregando: true,
    atualizando: false,
    erro: null,
    atualizadoEm: null,
  });
  const consultaAtual = useRef<AbortController | null>(null);

  const consultar = useCallback(async () => {
    consultaAtual.current?.abort();
    const controle = new AbortController();
    consultaAtual.current = controle;

    try {
      const servicos = await listarServicos(controle.signal);
      if (controle.signal.aborted) return;
      setEstado({ servicos, carregando: false, atualizando: false, erro: null, atualizadoEm: Date.now() });
    } catch (falha) {
      if (controle.signal.aborted) return;
      // Mantém os últimos dados válidos: a tela os marca como possivelmente desatualizados.
      setEstado((anterior) => ({ ...anterior, carregando: false, atualizando: false, erro: mensagemDeErro(falha) }));
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

  return { ...estado, recarregar };
}
