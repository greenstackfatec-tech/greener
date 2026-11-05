import type { EstadoProntidao } from "../hooks/useProntidao.ts";

function textoDoEstado(estado: EstadoProntidao): string {
  switch (estado.tipo) {
    case "carregando":
      return "Verificando backend e banco de dados...";
    case "ok":
      return `Backend: ${estado.dados.status} · Banco de dados: ${estado.dados.database}`;
    case "erro":
      return `Não foi possível verificar o backend: ${estado.mensagem}`;
  }
}

export function StatusBackend({ estado }: { estado: EstadoProntidao }) {
  return (
    <p className="status" data-state={estado.tipo} role="status" aria-live="polite">
      {textoDoEstado(estado)}
    </p>
  );
}
