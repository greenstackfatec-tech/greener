import { useIndicadores, type EstadoIndicadores } from "../hooks/useIndicadores.ts";

function formatar(valor: number, casas: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Ícone de informação com tooltip explicando a diferença energia vs CO₂e. */
function InfoEnergiaCarbono() {
  const texto = "Energia (kWh) é o consumo medido. CO₂e (g) = energia × intensidade de carbono da região (gCO₂e/kWh).";
  return (
    <span
      className="resumo-info"
      tabIndex={0}
      role="tooltip"
      aria-label={texto}
      data-tooltip={texto}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <path d="M8 5v4M8 11v1" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/**
 * Painel de consumo, só a parte visual: recebe o estado dos indicadores já carregado.
 * A tela administrativa usa esta versão para mostrar os mesmos números dos cards,
 * com uma única consulta a GET /dashboard/indicadores.
 *
 * TODO(TP17/DW11): quando existir endpoint de histórico por dia (últimos 7 dias),
 * voltar a exibir o gráfico de barras do protótipo aqui, alimentado por ele.
 */
export function ResumoConsumoVisao({ estado }: { estado: EstadoIndicadores }) {
  return (
    <section className="resumo" aria-labelledby="resumo-titulo">
      <h2 id="resumo-titulo">Consumo de energia</h2>
      <p className="resumo-legenda">Última coleta de cada serviço · kWh estimados</p>

      {estado.tipo === "carregando" && (
        <p className="resumo-aviso" role="status">Carregando indicadores...</p>
      )}

      {estado.tipo === "erro" && (
        <p className="resumo-aviso" data-estado="erro" role="alert">
          Não foi possível carregar os indicadores agora.
        </p>
      )}

      {estado.tipo === "ok" && estado.dados.consumoTotalKwh === 0 && estado.dados.emissaoTotalCo2eG === 0 && (
        <p className="resumo-aviso" role="status">Ainda não há coletas calculadas.</p>
      )}

      {estado.tipo === "ok" && (estado.dados.consumoTotalKwh > 0 || estado.dados.emissaoTotalCo2eG > 0) && (
        <dl className="resumo-lista">
          <div className="resumo-item" data-destaque="">
            <dt><span>Consumo total</span> <InfoEnergiaCarbono /></dt>
            <dd>{formatar(estado.dados.consumoTotalKwh, 4)} <small>kWh</small></dd>
          </div>
          <div className="resumo-item">
            <dt><span>Emissão total</span> <InfoEnergiaCarbono /></dt>
            <dd>{formatar(estado.dados.emissaoTotalCo2eG, 3)} <small>g CO₂e</small></dd>
            <dd className="resumo-explicacao">CO₂e = energia × intensidade de carbono da região</dd>
          </div>
          <div className="resumo-item">
            <dt>Serviços ativos</dt>
            <dd>{formatar(estado.dados.servicosAtivos, 0)}</dd>
          </div>
          <div className="resumo-item">
            <dt>Indisponíveis</dt>
            <dd>{formatar(estado.dados.servicosIndisponiveis, 0)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/**
 * Painel de consumo da tela de login. Mostra os indicadores consolidados reais
 * (GET /dashboard/indicadores). Não há nenhum valor fixo neste arquivo.
 */
export function ResumoConsumo() {
  const estado = useIndicadores();
  return <ResumoConsumoVisao estado={estado} />;
}