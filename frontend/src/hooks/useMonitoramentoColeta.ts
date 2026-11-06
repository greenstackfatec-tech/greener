import { useCallback, useEffect, useRef, useState } from "react";
import { consultarStatusColeta } from "../services/collections.ts";
import type { StatusRotina } from "../services/collections.ts";

export function useMonitoramentoColeta() {
  const [statusColeta, setStatusColeta] = useState<StatusRotina | null>(null);
  const [erroMonitoramento, setErroMonitoramento] = useState<string | null>(null);
  const pendente = useRef<AbortController | null>(null);

  const atualizarMonitoramento = useCallback(() => {
    if (pendente.current) return;
    const controller = new AbortController();
    pendente.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]);
    void consultarStatusColeta(signal).then((status) => {
      if (!controller.signal.aborted) {
        setStatusColeta(status);
        setErroMonitoramento(null);
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setErroMonitoramento("Não foi possível verificar o estado da coleta. O diagnóstico anterior pode estar desatualizado.");
      }
    }).finally(() => {
      if (pendente.current === controller) pendente.current = null;
    });
  }, []);

  useEffect(() => {
    void atualizarMonitoramento();
    const timer = window.setInterval(() => { void atualizarMonitoramento(); }, 5000);
    return () => {
      window.clearInterval(timer);
      pendente.current?.abort();
      pendente.current = null;
    };
  }, [atualizarMonitoramento]);

  return { statusColeta, erroMonitoramento, atualizarMonitoramento };
}
