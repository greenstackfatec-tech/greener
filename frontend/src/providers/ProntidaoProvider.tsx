import type { ReactNode } from "react";
import { ProntidaoContext } from "../contexts/ProntidaoContext.ts";
import { useProntidao } from "../hooks/useProntidao.ts";

export function ProntidaoProvider({ children }: { children: ReactNode }) {
  const estado = useProntidao();
  return <ProntidaoContext.Provider value={estado}>{children}</ProntidaoContext.Provider>;
}
