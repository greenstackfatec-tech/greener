import { useEffect, useState } from "react";
import { consultarIndicadores, type Indicadores } from "../services/indicadores.ts";

export type EstadoIndicadores =
  | { tipo: "carregando" }
  | { tipo: "ok"; dados: Indicadores }
  | { tipo: "erro" };

export function useIndicadores(): EstadoIndicadores {
  const [estado, setEstado] = useState<EstadoIndicadores>({ tipo: "carregando" });

  useEffect(() => {
    const controle = new AbortController();
    consultarIndicadores(controle.signal)
      .then((dados) => setEstado({ tipo: "ok", dados }))
      .catch(() => {
        if (controle.signal.aborted) return;
        setEstado({ tipo: "erro" });
      });
    return () => controle.abort();
  }, []);

  return estado;
}