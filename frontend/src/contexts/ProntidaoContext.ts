import { createContext, useContext } from "react";
import type { EstadoProntidao } from "../hooks/useProntidao.ts";

/** Disponibilidade do backend e do banco, compartilhada por todas as telas. */
export const ProntidaoContext = createContext<EstadoProntidao | null>(null);

export function useProntidaoContext(): EstadoProntidao {
  const estado = useContext(ProntidaoContext);
  if (!estado) {
    throw new Error("useProntidaoContext precisa estar dentro de <ProntidaoProvider>.");
  }
  return estado;
}
