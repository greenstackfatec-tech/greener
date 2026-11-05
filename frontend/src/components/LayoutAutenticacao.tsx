import "@fontsource-variable/inter";
import type { ReactNode } from "react";
import { Link } from "react-router";
import logo from "../assets/greener-icon.png";
import { ROTAS } from "../caminhos.ts";
import { GraficoConsumo } from "./GraficoConsumo.tsx";
import "./LayoutAutenticacao.css";

function Logo() {
  return (
    <div className="auth-logo">
      <img src={logo} alt="" width={32} height={32} />
      <span>GreenER</span>
    </div>
  );
}

/**
 * Moldura das telas de autenticação (login e, depois, cadastro).
 * Desktop: painel verde à esquerda + formulário à direita. Mobile: cabeçalho + formulário.
 */
export function LayoutAutenticacao({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <header className="auth-topo">
        <Logo />
        <Link to={ROTAS.inicio}>Voltar</Link>
      </header>

      <aside className="auth-painel">
        <Logo />
        <p className="auth-eyebrow auth-eyebrow-escuro">Software mais sustentável</p>
        <p className="auth-painel-titulo">Entenda o impacto de cada execução.</p>
        <p className="auth-painel-texto">
          Acompanhe o consumo de energia e as emissões de CO₂e dos seus softwares em um só lugar.
        </p>
        <GraficoConsumo />
        <p className="auth-painel-subtitulo">Medir é o primeiro passo.</p>
        <p className="auth-painel-apoio">
          Transforme dados de execução em uma visão mais clara do impacto ambiental.
        </p>
      </aside>

      <main className="auth-conteudo">
        <Link className="auth-voltar" to={ROTAS.inicio}>
          Voltar à Homepage
        </Link>

        <div className="auth-formulario">
          {children}

          <div className="auth-destaque">
            <p>Cada execução conta.</p>
            <p>Monitoramento de energia e emissões de CO₂e para seus softwares.</p>
          </div>
        </div>

        <p className="auth-rodape">
          <span>GreenStack · Projeto acadêmico</span>
          <span className="auth-rodape-separador"> · </span>
          <span>Protótipo com dados ilustrativos</span>
        </p>
      </main>
    </div>
  );
}