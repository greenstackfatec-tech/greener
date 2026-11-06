import "@fontsource-variable/inter";
import { Link } from "react-router";
import logo from "../assets/greener-icon.png";
import { ROTAS } from "../caminhos.ts";
import "./InicioPage.css";

const BENEFICIOS = [
  "Recursos computacionais",
  "Energia estimada",
  "Emissões de CO₂e",
] as const;

const ETAPAS = [
  {
    numero: "01",
    titulo: "Conecte sua aplicação",
    descricao:
      "Organize seus projetos e prepare o monitoramento dos recursos utilizados pelo software.",
  },
  {
    numero: "02",
    titulo: "Acompanhe o consumo",
    descricao:
      "Reúna CPU, memória, disco e rede para estimar energia e emissões de CO₂e.",
  },
  {
    numero: "03",
    titulo: "Decida com contexto",
    descricao:
      "Compare aplicações, períodos e regiões para encontrar oportunidades de eficiência.",
  },
] as const;

function Marca() {
  return (
    <Link
      className="inicio-marca"
      to={ROTAS.inicio}
      aria-label="GreenER, página inicial"
    >
      <img src={logo} alt="" width={32} height={32} />
      <span>GreenER</span>
    </Link>
  );
}

function IconeCheck() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m4 10 4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreviewMetricas() {
  return (
    <div className="preview-metricas" aria-label="Indicadores do GreenER">
      <article className="preview-card preview-card-vazio">
        <span>Energia estimada</span>
        <div className="preview-card-valor" aria-label="Sem valor" />
      </article>

      <article className="preview-card preview-card-vazio">
        <span>Emissões estimadas</span>
        <div className="preview-card-valor" aria-label="Sem valor" />
      </article>
    </div>
  );
}

function PreviewGrafico() {
  return (
    <section className="preview-grafico" aria-label="Gráfico de consumo estimado">
      <div className="preview-grafico-titulo">
        <h2>Consumo estimado</h2>
        <span>Histórico de consumo · kWh</span>
      </div>

      <div className="preview-grafico-area" aria-hidden="true">
        <span className="preview-bar preview-bar-1" />
        <span className="preview-bar preview-bar-2" />
        <span className="preview-bar preview-bar-3" />
        <span className="preview-bar preview-bar-4" />
        <span className="preview-bar preview-bar-5" />
      </div>
    </section>
  );
}

function PainelPreview() {
  return (
    <aside className="inicio-preview" aria-label="Prévia da área de indicadores do GreenER">
      <header className="preview-cabecalho">
        <div>
          <p className="preview-titulo">Visão geral</p>
          <span className="preview-subtitulo">Seu ambiente de monitoramento</span>
        </div>

        <span className="preview-selo">após o cadastro</span>
      </header>

      <PreviewMetricas />
      <PreviewGrafico />

      <div className="preview-recursos" aria-label="Recursos acompanhados">
        {[
          "CPU",
          "Memória",
          "Disco",
          "Rede",
        ].map((recurso) => (
          <div className="preview-recurso" key={recurso}>
            <span className="preview-ponto" aria-hidden="true" />
            <span>{recurso}</span>
            <strong aria-label="Sem valor">—</strong>
          </div>
        ))}
      </div>

      <div className="preview-metodologia">
        <span className="preview-info" aria-hidden="true">
          i
        </span>
        <div>
          <strong>Metodologia das estimativas</strong>
          <p>CPU, memória, disco, rede e intensidade de carbono regional.</p>
        </div>
      </div>

      <div className="preview-status">
        <strong>Status dos serviços</strong>

        <div>
          <span className="status-ponto status-ponto-ativo" />
          Ativos <b aria-label="Sem valor">—</b>
        </div>

        <div>
          <span className="status-ponto status-ponto-sem-metricas" />
          Sem métricas <b aria-label="Sem valor">—</b>
        </div>

        <div>
          <span className="status-ponto status-ponto-indisponivel" />
          Indisponíveis <b aria-label="Sem valor">—</b>
        </div>
      </div>
    </aside>
  );
}

function Cabecalho() {
  return (
    <header className="inicio-header">
      <div className="inicio-container inicio-header-conteudo">
        <Marca />

        <nav className="inicio-navegacao" aria-label="Acesso à plataforma">
          <span className="inicio-frase-header">Tecnologia com mais consciência</span>

          <Link className="inicio-botao inicio-botao-secundario inicio-entrar" to={ROTAS.login}>
            Entrar
          </Link>

          <Link className="inicio-botao inicio-botao-principal inicio-criar-header" to={ROTAS.cadastro}>
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Apresentacao() {
  return (
    <section className="inicio-hero">
      <div className="inicio-container inicio-hero-grade">
        <div className="inicio-apresentacao">
          <span className="inicio-eyebrow">Software mais consciente</span>

          <h1>A energia por trás do seu código.</h1>

          <p className="inicio-descricao">
            Entenda o consumo estimado de energia e as emissões de CO₂e das suas
            aplicações, com contexto para comparar serviços e regiões.
          </p>

          <div className="inicio-acoes">
            <Link className="inicio-botao inicio-botao-principal" to={ROTAS.cadastro}>
              Começar a monitorar
            </Link>
          </div>
        </div>

        <PainelPreview />
      </div>
    </section>
  );
}

function FaixaBeneficios() {
  return (
    <section className="inicio-beneficios" aria-label="O que o GreenER acompanha">
      <div className="inicio-container inicio-beneficios-conteudo">
        <strong>Do recurso ao impacto</strong>

        {BENEFICIOS.map((beneficio) => (
          <span className="inicio-beneficio" key={beneficio}>
            <IconeCheck />
            {beneficio}
          </span>
        ))}
      </div>
    </section>
  );
}

function SecaoEtapas() {
  return (
    <section className="inicio-etapas">
      <div className="inicio-container">
        <span className="inicio-eyebrow">Da medição à ação</span>

        <h2>Conheça. Acompanhe. Melhore.</h2>

        <p className="inicio-etapas-intro">
          Métricas técnicas e indicadores ambientais reunidos em uma visão clara para
          apoiar decisões.
        </p>

        <div className="inicio-etapas-grade">
          {ETAPAS.map((etapa) => (
            <article className="inicio-etapa" key={etapa.numero}>
              <span className="inicio-etapa-numero">{etapa.numero}</span>
              <h3>{etapa.titulo}</h3>
              <p>{etapa.descricao}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChamadaFinal() {
  return (
    <section className="inicio-cta">
      <div className="inicio-container inicio-cta-conteudo">
        <h2>
          Dê visibilidade ao impacto
          <br className="inicio-quebra-desktop" /> do seu software.
        </h2>

        <p>Comece a construir uma rotina de tecnologia mais consciente.</p>

        <Link className="inicio-botao inicio-botao-principal" to={ROTAS.cadastro}>
          Criar minha conta
        </Link>
      </div>
    </section>
  );
}

function Rodape() {
  return (
    <footer className="inicio-footer">
      <div className="inicio-container inicio-footer-conteudo">
        <Marca />
        <p>GreenStack · Projeto acadêmico</p>
      </div>
    </footer>
  );
}

export function InicioPage() {
  return (
    <div className="pagina-inicio">
      <Cabecalho />

      <main className="inicio-conteudo">
        <Apresentacao />
        <FaixaBeneficios />
        <SecaoEtapas />
        <ChamadaFinal />
      </main>

      <Rodape />
    </div>
  );
}
