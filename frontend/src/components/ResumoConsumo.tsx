import { useIndicadores } from "../hooks/useIndicadores.ts";

function formatar(valor: number, casas: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/**
 * Painel de consumo da tela de login. Mostra os indicadores consolidados reais
 * (GET /dashboard/indicadores). Não há nenhum valor fixo neste arquivo.
 *
 * TODO(TP17/DW11): quando existir endpoint de histórico por dia (últimos 7 dias),
 * voltar a exibir o gráfico de barras do protótipo aqui, alimentado por ele.
 */
export function ResumoConsumo() {
  const estado = useIndicadores();

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
            <dt>Consumo total</dt>
            <dd>{formatar(estado.dados.consumoTotalKwh, 4)} <small>kWh</small></dd>
          </div>
          <div className="resumo-item">
            <dt>Emissão total</dt>
            <dd>{formatar(estado.dados.emissaoTotalCo2eG, 3)} <small>g CO₂e</small></dd>
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