import { useNavigate } from "react-router";
import { ROTAS } from "../caminhos.ts";
import { sair } from "../services/auth.ts";
import "./BotaoSair.css";

/**
 * Botão "Sair da conta" da barra lateral das telas privadas (DW17).
 * Apaga o token do navegador (`sair()`, em services/auth.ts) e leva ao /login.
 * O `replace` tira a tela privada do histórico; se alguém voltar a ela mesmo assim,
 * <RotaPrivada /> manda de volta ao login por falta de token.
 *
 * TODO (backend): o logout vale só no navegador, porque o JWT é stateless (expira em 1 h) e
 * não existe endpoint de logout. Se um dia houver revogação de token, chamá-la aqui antes de `sair()`.
 */
export function BotaoSair() {
  const navigate = useNavigate();

  function encerrarSessao() {
    sair();
    navigate(ROTAS.login, { replace: true });
  }

  return (
    <button
      type="button"
      className="botao-sair"
      aria-label="Sair da conta"
      title="Sair da conta"
      onClick={encerrarSessao}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      <span className="botao-sair-texto">Sair da conta</span>
    </button>
  );
}