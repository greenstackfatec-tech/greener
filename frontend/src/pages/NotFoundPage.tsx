import { Link } from "react-router";
import logo from "../assets/greener-icon.png";
import { ROTAS } from "../caminhos.ts";
import "./NotFoundPage.css";

export function NotFoundPage() {
  return (
    <main className="not-found">
      <div className="not-found__container">
        <header className="not-found__header">
          <Link className="not-found__marca" to={ROTAS.inicio} aria-label="GreenER, página inicial">
            <img src={logo} alt="" width={32} height={32} />
            <span>GreenER</span>
          </Link>
        </header>

        <div className="not-found__content">
          <h1 className="not-found__code" aria-level={1}>404</h1>

          <h2 className="not-found__title">Página não encontrada</h2>

          <p className="not-found__message">
            O caminho que você procura não existe ou foi movido.
          </p>

          <Link to={ROTAS.inicio} className="not-found__btn">
            Voltar ao início
          </Link>
        </div>

        <footer className="not-found__footer">
          <p>GreenStack · Projeto acadêmico</p>
        </footer>
      </div>
    </main>
  );
}