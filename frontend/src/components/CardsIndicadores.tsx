import type { ReactNode } from "react";
import type { EstadoIndicadores } from "../hooks/useIndicadores.ts";
import { numero } from "../formatacao.ts";
import "./CardsIndicadores.css";

interface Props {
  estado: EstadoIndicadores;
  /** Ação do botão "Tentar de novo" do aviso de erro. */
  aoTentarDeNovo: () => void;
}

interface CartaoProps {
  icone: ReactNode;
  cor: "green" | "gray";
  titulo: string;
  valor: string;
  unidade?: string;
  legenda: string;
  carregando: boolean;
}

function Cartao({ icone, cor, titulo, valor, unidade, legenda, carregando }: CartaoProps) {
  return (
    <article className="dash-summary-card">
      <span className={`dash-summary-icon ${cor}`} aria-hidden="true">{icone}</span>
      <div>
        <small>{titulo}</small>
        <strong>
          {carregando ? (
            <span className="ind-esqueleto" aria-hidden="true" />
          ) : (
            <>
              {valor}
              {unidade && valor !== "—" && <span className="ind-unidade"> {unidade}</span>}
            </>
          )}
        </strong>
        <em>{legenda}</em>
      </div>
    </article>
  );
}

const IconeEnergia = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);

const IconeEmissao = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
    <path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 8.5a4.75 4.75 0 0 1 .5 9.5z" />
  </svg>
);

/**
 * Cards de indicadores consolidados do dashboard (RF08, DW06): consumo total,
 * emissão total, serviços ativos e serviços indisponíveis.
 * Os valores vêm de GET /dashboard/indicadores; aqui não há nenhum número fixo.
 */
export function CardsIndicadores({ estado, aoTentarDeNovo }: Props) {
  const carregando = estado.tipo === "carregando";
  const dados = estado.tipo === "ok" ? estado.dados : estado.tipo === "erro" ? estado.dadosAnteriores : null;
  const semCalculo = dados !== null && dados.consumoTotalKwh === 0 && dados.emissaoTotalCo2eG === 0;

  /** Legenda de cada card: o texto da situação, ou o padrão do card quando há valor. */
  const legenda = (padrao: string, soTotais = false): string => {
    if (carregando) return "Carregando...";
    if (dados === null) return "Indisponível no momento";
    if (soTotais && semCalculo) return "Ainda sem coletas calculadas";
    return padrao;
  };

  return (
    <section className="ind" aria-label="Indicadores consolidados" aria-busy={carregando}>
      {carregando && <p className="ind-sr" role="status">Carregando indicadores consolidados...</p>}

      {estado.tipo === "erro" && (
        <div className="ind-aviso" role="alert">
          <i aria-hidden="true" />
          <div>
            <strong>Erro de atualização</strong>
            <span>
              {dados === null
                ? "Não foi possível carregar os indicadores consolidados."
                : "Não foi possível atualizar os indicadores consolidados. Os valores abaixo podem estar desatualizados."}
            </span>
            <button type="button" onClick={aoTentarDeNovo}>Tentar de novo</button>
          </div>
        </div>
      )}

      <div className="dash-summary">
        <Cartao
          icone={IconeEnergia}
          cor="green"
          titulo="Consumo total"
          valor={numero(dados?.consumoTotalKwh ?? null, 4)}
          unidade="kWh"
          legenda={legenda("Última coleta de cada serviço", true)}
          carregando={carregando}
        />
        <Cartao
          icone={IconeEmissao}
          cor="green"
          titulo="Emissão total"
          valor={numero(dados?.emissaoTotalCo2eG ?? null, 3)}
          unidade="g CO₂e"
          legenda={legenda("CO₂e estimado", true)}
          carregando={carregando}
        />
        <Cartao
          icone="✓"
          cor="green"
          titulo="Serviços ativos"
          valor={numero(dados?.servicosAtivos ?? null, 0)}
          legenda={legenda("Em operação")}
          carregando={carregando}
        />
        <Cartao
          icone="!"
          cor="gray"
          titulo="Serviços indisponíveis"
          valor={numero(dados?.servicosIndisponiveis ?? null, 0)}
          legenda={legenda("Sem resposta na coleta")}
          carregando={carregando}
        />
      </div>
    </section>
  );
}
