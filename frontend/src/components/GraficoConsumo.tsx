import "./LayoutAutenticacao.css";

/**
 * Gráfico de barras simplificado de consumo dos últimos 7 dias.
 * Usa as classes .grafico-* do LayoutAutenticacao.css (mantido do protótipo).
 * Dados mockados conforme protótipo Figma.
 */
export function GraficoConsumo() {
  const dados = [
    { dia: "21 set", kwh: 28.4 },
    { dia: "22 set", kwh: 31.2 },
    { dia: "23 set", kwh: 26.7 },
    { dia: "24 set", kwh: 33.1 },
    { dia: "25 set", kwh: 29.8 },
    { dia: "26 set", kwh: 35.6 },
    { dia: "27 set", kwh: 30.5 },
  ];

  const maxKwh = Math.max(...dados.map((d) => d.kwh));

  return (
    <section className="grafico" aria-labelledby="grafico-titulo">
      <h2 id="grafico-titulo" className="grafico-titulo">
        Consumo dos últimos 7 dias
      </h2>
      <div className="grafico-barras" role="img" aria-label="Gráfico de barras do consumo energético dos últimos 7 dias">
        {dados.map((item) => (
          <div key={item.dia} className="grafico-barra-wrapper">
            <div
              className="grafico-barra"
              style={{ height: `${(item.kwh / maxKwh) * 100}%` }}
              title={`${item.dia}: ${item.kwh.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kWh`}
            />
            <span className="grafico-legenda">{item.dia}</span>
          </div>
        ))}
      </div>
      <p className="grafico-unidade">kWh estimados</p>
    </section>
  );
}
