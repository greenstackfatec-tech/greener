import { useId } from "react";
import type { InputHTMLAttributes } from "react";

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  rotulo: string;
  /** Mensagem de erro: deixa a borda e o texto vermelhos. */
  erro?: string | null;
  /** Texto de apoio mostrado quando não há erro. */
  ajuda?: string;
}

/** Rótulo + campo + mensagem, no padrão visual das telas de autenticação. */
export function CampoTexto({ rotulo, erro, ajuda, ...props }: CampoTextoProps) {
  const id = useId();
  const idMensagem = `${id}-mensagem`;
  const mensagem = erro ?? ajuda ?? null;

  return (
    <div className="auth-campo">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={mensagem ? idMensagem : undefined}
        {...props}
      />
      {/* O espaço da mensagem é sempre reservado para a tela não "pular" quando o erro aparece. */}
      <p id={idMensagem} className="auth-campo-mensagem" data-erro={erro ? "" : undefined}>
        {mensagem}
      </p>
    </div>
  );
}