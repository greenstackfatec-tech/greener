import { StatusBackend } from "../components/StatusBackend.tsx";
import { useProntidao } from "../hooks/useProntidao.ts";

export function InicioPage() {
  const estado = useProntidao();

  return (
    <main>
      <h1>GreenER</h1>
      <p>Ambiente de desenvolvimento iniciado.</p>
      <StatusBackend estado={estado} />
    </main>
  );
}
