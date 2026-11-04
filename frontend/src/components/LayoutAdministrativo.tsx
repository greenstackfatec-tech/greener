import "@fontsource-variable/inter";
import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import logo from "../assets/greener-icon.png";
import { ROTAS } from "../caminhos.ts";
import "./LayoutAdministrativo.css";

function IconeInicio() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconeColaboradores() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.6-4 3.5-6 7.5-6s6.9 2 7.5 6" />
    </svg>
  );
}

interface LayoutAdministrativoProps {
  children: ReactNode;
  /** Chamado ao clicar em "Sair da conta". A página decide o que fazer (apagar o token e ir ao login). */
  aoSair: () => void;
}

/**
 * Moldura da área logada (docs/design/tela-admin-desktop.png e tela-admin-mobile.png).
 * Desktop: menu lateral fixo + barra superior. Mobile: cabeçalho com logo e botão de menu,
 * mais as duas abas de navegação. Telas futuras da área logada (ex.: Colaboradores) reaproveitam este layout.
 */
export function LayoutAdministrativo({ children, aoSair }: LayoutAdministrativoProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="adm">
      <aside className="adm-lateral" data-aberto={menuAberto ? "" : undefined}>
        <div className="adm-marca">
          <img src={logo} alt="" width={32} height={32} />
          <span>GreenER</span>
        </div>

        <button
          type="button"
          className="adm-menu-botao"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          aria-controls="adm-rodape-lateral"
          onClick={() => setMenuAberto((atual) => !atual)}
        >
          <IconeInicio />
        </button>

        {/* Dado fixo do protótipo. TODO: trocar pelo workspace do usuário quando houver endpoint. */}
        <div className="adm-workspace">
          <span>Workspace</span>
          <strong>Demonstração</strong>
        </div>

        <nav className="adm-nav" aria-label="Principal">
          <NavLink to={ROTAS.administrativa} end className="adm-nav-item">
            <IconeInicio />
            Início
          </NavLink>
          {/* TODO: a tela Colaboradores é de outra tarefa e ainda não tem rota. Trocar por <NavLink to={ROTAS.colaboradores}> quando existir. */}
          <span className="adm-nav-item" aria-disabled="true" title="Em breve">
            <IconeColaboradores />
            Colaboradores
          </span>
        </nav>

        <div className="adm-lateral-rodape" id="adm-rodape-lateral">
          <strong>GreenStack</strong>
          <span>Protótipo de navegação</span>
          <button type="button" className="adm-botao-contorno" onClick={aoSair}>
            Sair da conta
          </button>
        </div>
      </aside>

      <header className="adm-topo">
        <span className="adm-topo-caminho">Workspace / Início</span>
        <span className="adm-selo">Ambiente de demonstração</span>
        {/* Iniciais fixas do protótipo. TODO: usar as iniciais do usuário logado quando houver endpoint de perfil. */}
        <span className="adm-avatar" aria-hidden="true">GS</span>
      </header>

      <main className="adm-conteudo">{children}</main>
    </div>
  );
}
