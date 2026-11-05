import { useEffect, useState } from "react";
import { consultarProntidao, type Prontidao } from "../services/api.ts";

export type EstadoProntidao =
  | { tipo: "carregando" }
  | { tipo: "ok"; dados: Prontidao }
  | { tipo: "erro"; mensagem: string };

export function useProntidao(): EstadoProntidao {
  const [estado, setEstado] = useState<EstadoProntidao>({ tipo: "carregando" });

  useEffect(() => {
    const controle = new AbortController();
    consultarProntidao(controle.signal)
      .then((dados) => setEstado({ tipo: "ok", dados }))
      .catch((erro: unknown) => {
        if (controle.signal.aborted) return;
        setEstado({ tipo: "erro", mensagem: erro instanceof Error ? erro.message : String(erro) });
      });
    return () => controle.abort();
  }, []);

  return estado;
}
