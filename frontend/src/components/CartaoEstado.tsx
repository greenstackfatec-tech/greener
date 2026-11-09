import { NAO_INFORMADO, type LocalizacaoExibida } from "../localizacao.ts";
import "./CartaoEstado.css";

/** Os seis estados do mock DD07. */
export type TomEstado = "ativo" | "indisponivel" | "sem_metricas" | "carregando" | "erro" | "vazio";

interface Props {
  tom: TomEstado;
  titulo: string;
  /** Selo no canto: "Operacional", "Sem resposta"... */
  selo: string;
  descricao: string;
  /** Texto grande. `null` mostra o traço de "sem leitura"; ignorado em "carregando" (mostra os pontos). */
  valor?: string | null;
  rodape: string;
  /** Ação ao lado do rodapé, como "Tentar de novo". */
  acao?: { rotulo: string; aoClicar: () => void; desabilitada?: boolean };
  /** Nível do título na hierarquia da página. */
  nivelTitulo?: 2 | 3;
  /** País, região e cidade do serviço (RF12); campo ausente chega como "Não informado". */
  localizacao?: LocalizacaoExibida;
}

/** Cartão de estado do DD07: barra lateral, ponto, selo, valor e rodapé na cor do estado. */
export function CartaoEstado({ tom, titulo, selo, descricao, valor, rodape, acao, nivelTitulo = 3, localizacao }: Props) {
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  // Carregando avisa com educação (status); erro interrompe (alert).
  const papel = tom === "carregando" ? "status" : tom === "erro" ? "alert" : undefined;

  return (
    <article className="cartao-estado" data-tom={tom} role={papel} aria-busy={tom === "carregando" || undefined}>
      <header className="cartao-estado-topo">
        <Titulo className="cartao-estado-titulo">
          <i className="cartao-estado-ponto" aria-hidden="true" />
          {titulo}
        </Titulo>
        <span className="cartao-estado-selo">{selo}</span>
      </header>
      <p className="cartao-estado-descricao">{descricao}</p>
      {localizacao && (
        <dl className="cartao-estado-local" aria-label="Localização do serviço">
          {(
            [
              ["País", localizacao.pais],
              ["Região", localizacao.regiao],
              ["Cidade", localizacao.cidade],
            ] as const
          ).map(([rotulo, texto]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd className={texto === NAO_INFORMADO ? "sem-info" : undefined}>{texto}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="cartao-estado-valor">
        {tom === "carregando" ? (
          <span className="cartao-estado-pontos" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : valor === null || valor === undefined ? (
          <span className="cartao-estado-traco" role="img" aria-label="Sem valor" />
        ) : (
          <strong>{valor}</strong>
        )}
      </div>
      <p className="cartao-estado-rodape">
        <span>{rodape}</span>
        {acao && (
          <>
            <span aria-hidden="true"> · </span>
            <button type="button" onClick={acao.aoClicar} disabled={acao.desabilitada}>
              {acao.rotulo}
            </button>
          </>
        )}
      </p>
    </article>
  );
}
