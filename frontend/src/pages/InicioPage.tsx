import { StatusBackend } from "../components/StatusBackend.tsx";
import { useProntidaoContext } from "../contexts/ProntidaoContext.ts";

export function InicioPage() {
  const estado = useProntidaoContext();

  return (
    <main>
      <h1>GreenER</h1>
      <p>Ambiente de desenvolvimento iniciado.</p>
      <StatusBackend estado={estado} />
    </main>
  );
}
