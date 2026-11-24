import "@fontsource-variable/inter";
import { Link, useLocation } from "react-router";
import logo from "../assets/greener-icon.png";
import githubLogo from "../assets/github-logo.svg";
import { ROTAS } from "../caminhos.ts";
import "./Footer.css";

/**
 * Rodapé completo (homepage) - com equipe, links, GitHub.
 * Rodapé mínimo (admin/auth) - apenas logo + copyright.
 */

// Links de navegação pública (funcionais)
const LINKS_PUBLICOS = [
  { label: "Início", href: ROTAS.inicio },
  { label: "Login", href: ROTAS.login },
  { label: "Cadastro", href: ROTAS.cadastro },
] as const;

// Integrantes do grupo - dados do README.md
const INTEGRANTES = [
  { nome: "Igor Iansen", github: "igoriansen", papel: "Product Owner" },
  { nome: "Fernanda Fonseca", github: "fernandafonseca-dev", papel: "Scrum Master" },
  { nome: "Thiago Souza", github: "thiagosantos-17", papel: "Desenvolvedor" },
  { nome: "Renan Santos", github: "renanrmsantos14", papel: "Desenvolvedor" },
  { nome: "Guilherme Matos", github: "gm-paiva", papel: "Desenvolvedor" },
  { nome: "Júlia de Oliveira", github: "juliasilverio-dev", papel: "Desenvolvedora" },
] as const;

interface FooterProps {
  /** Variante do rodapé */
  variante?: "completo" | "minimo";
  /** Texto customizado de copyright (opcional) */
  copyright?: string;
}

/** Rodapé completo - usado apenas na homepage */
export function Footer({ variante = "completo", copyright }: FooterProps) {
  const location = useLocation();
  const isMinimo = variante === "minimo";

  // Handler para "Início": se já está na home, scrolla pro topo; senão navega
  const handleInicioClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === ROTAS.inicio) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Rodapé mínimo (admin/auth) - apenas logo + copyright
  if (isMinimo) {
    return (
      <footer className="footer footer--minimo" role="contentinfo">
        <div className="footer-container footer-container--minimo">
          <div className="footer-minimo">
            <Link className="footer-minimo-marca" to={ROTAS.inicio} aria-label="GreenER, página inicial">
              <img src={logo} alt="" width={20} height={20} />
              <span>GreenER</span>
            </Link>
            <p className="footer-minimo-copyright">
              {copyright ?? "© 2026 GreenStack. Todos os direitos reservados."}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Rodapé completo (homepage)
  return (
    <footer className="footer footer--completo" role="contentinfo">
      <div className="footer-container">
        {/* ===== SEÇÃO SUPERIOR: Marca + Links ===== */}
        <div className="footer-grid">
          {/* Coluna 1: Marca e descrição */}
          <div className="footer-col footer-col--marca">
            <Link className="footer-marca" to={ROTAS.inicio} aria-label="GreenER, página inicial">
              <img src={logo} alt="" width={28} height={28} />
              <span>GreenER</span>
            </Link>
            <p className="footer-descricao">
              Monitoramento de energia e emissões de CO₂e para softwares mais conscientes.
            </p>
            <span className="footer-badge">GreenStack · Projeto acadêmico</span>
          </div>

          {/* Coluna 2: Links rápidos */}
          <nav className="footer-col footer-col--links" aria-label="Navegação">
            <h3 className="footer-titulo">Navegação</h3>
            <ul className="footer-lista">
              {LINKS_PUBLICOS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="footer-link"
                    onClick={link.href === ROTAS.inicio ? handleInicioClick : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Coluna 3: Integrantes + GitHub do projeto */}
          <div className="footer-col footer-col--equipe">
            <h3 className="footer-titulo">Equipe Green Stack</h3>
            <ul className="footer-equipe" role="list">
              {INTEGRANTES.map((integrante) => (
                <li key={integrante.github} className="footer-integrante">
                  <a
                    href={`https://github.com/${integrante.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-integrante-link"
                    aria-label={`GitHub de ${integrante.nome}`}
                  >
                    <img
                      src={`https://avatars.githubusercontent.com/${integrante.github}?s=60&v=4`}
                      alt=""
                      width={36}
                      height={36}
                      className="footer-avatar"
                      loading="lazy"
                    />
                    <div className="footer-integrante-info">
                      <span className="footer-integrante-nome">{integrante.nome}</span>
                      <span className="footer-integrante-papel">{integrante.papel}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>

            {/* GitHub do projeto abaixo da equipe */}
            <div className="footer-github-projeto">
              <a
                href="https://github.com/greenstackfatec-tech/greener"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-github-link"
                aria-label="Repositório do GreenER no GitHub"
              >
                <img src={githubLogo} alt="" width={20} height={20} className="footer-github-logo" />
                <span>Repositório no GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* ===== DIVISÓRIA ===== */}
        <hr className="footer-divisoria" />

        {/* ===== SEÇÃO INFERIOR: Copyright ===== */}
        <div className="footer-base">
          <p className="footer-copyright">
            {copyright ?? "© 2026 GreenStack. Todos os direitos reservados."}
          </p>
        </div>
      </div>
    </footer>
  );
}