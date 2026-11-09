export interface ItemRecurso {
  nome: string;
  percentual: number;
}

/**
 * Card "Por recurso": barras de progresso com a parcela do consumo de cada recurso.
 * `itens` null significa "o backend ainda não envia esse dado": o card avisa em vez de inventar valores.
 */
export function ConsumoPorRecurso({ itens }: { itens: ItemRecurso[] | null }) {
  return (
    <section className="adm-card" aria-labelledby="recurso-titulo">
      <h2 id="recurso-titulo" className="adm-card-titulo">Por recurso</h2>
      <p className="adm-card-legenda">Parcela do consumo estimado</p>
      {itens === null ? (
        <p className="adm-estado" role="status">
          Ainda não disponível: a divisão do consumo entre CPU, memória, disco e rede será exibida quando o
          servidor passar a calculá-la.
        </p>
      ) : (
        <ul className="adm-recursos">
          {itens.map((item) => (
            <li key={item.nome}>
              <div className="adm-recurso-linha">
                <span>{item.nome}</span>
                <span>{item.percentual}%</span>
              </div>
              <div
                className="adm-recurso-trilho"
                role="progressbar"
                aria-label={item.nome}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percentual}
              >
                <div className="adm-recurso-barra" style={{ width: `${item.percentual}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
