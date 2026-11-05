// Valores ilustrativos do protótipo (Figma). Não vêm do backend.
const CONSUMO_7_DIAS = [
  { dia: "Seg", valor: 28, texto: "28" },
  { dia: "Ter", valor: 32, texto: "32" },
  { dia: "Qua", valor: 29, texto: "29" },
  { dia: "Qui", valor: 24, texto: "24" },
  { dia: "Sex", valor: 27, texto: "27" },
  { dia: "Sáb", valor: 22, texto: "22" },
  { dia: "Dom", valor: 21.6, texto: "21,6" },
];
const MAIOR_VALOR = Math.max(...CONSUMO_7_DIAS.map((item) => item.valor));

export function GraficoConsumo() {
  return (
    <section className="grafico" aria-labelledby="grafico-titulo">
      <h2 id="grafico-titulo">Consumo de energia</h2>
      <p className="grafico-legenda">Últimos 7 dias · kWh estimados</p>
      <ul className="grafico-barras">
        {CONSUMO_7_DIAS.map((item, indice) => (
          <li key={item.dia}>
            <span className="grafico-valor">{item.texto}</span>
            <span
              className="grafico-barra"
              data-destaque={indice === CONSUMO_7_DIAS.length - 1 ? "" : undefined}
              style={{ height: `${(item.valor / MAIOR_VALOR) * 134}px` }}
            />
            <span className="grafico-dia">{item.dia}</span>
          </li>
        ))}
      </ul>
      <p className="grafico-legenda">Valores ilustrativos para explorar o protótipo.</p>
    </section>
  );
}