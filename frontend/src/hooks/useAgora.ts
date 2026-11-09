import { useEffect, useState } from "react";

/** Instante atual em ms, renovado a cada `intervaloMs`, para textos como "há 4 min" se atualizarem. */
export function useAgora(intervaloMs = 30_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}
