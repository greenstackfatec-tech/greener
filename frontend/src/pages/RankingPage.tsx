import "@fontsource-variable/inter";
import { useEffect, useState, type FormEvent } from "react";
import logo from "../assets/greener-icon.png";
import { ROTAS } from "../caminhos.ts";
import { BotaoSair } from "../components/BotaoSair.tsx";
import { CartaoEstado } from "../components/CartaoEstado.tsx";
import { ATALHOS_PERIODO, erroDoPeriodo, paraCampoDataHora, resolverPeriodo, type AtalhoPeriodo } from "../filtros.ts";
import { dataHora, numero } from "../formatacao.ts";
import { consultarRanking, type RankingItem, type RankingParams, type RankingResposta } from "../services/analytics.ts";
import "./DashboardPage.css";
import "./RankingPage.css";

const DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE = 20;
const METRICAS = {
  energiaTotal: { metrica: "energia", agregacao: "total" },
  co2eTotal: { metrica: "co2e", agregacao: "total" },
  energiaMedia: { metrica: "energia", agregacao: "media" },
  co2eMedia: { metrica: "co2e", agregacao: "media" },
} as const;

type Filtros = {
  periodo: AtalhoPeriodo | "30d";
  inicio: string;
  fim: string;
  metrica: keyof typeof METRICAS;
  ordenacao: RankingParams["ordenacao"];
  escopo: string;
};

const FILTROS_INICIAIS: Filtros = {
  periodo: "30d", inicio: "", fim: "", metrica: "co2eMedia", ordenacao: "ASC", escopo: "",
};

type RespostaConsulta = { consulta: RankingParams } & (
  { dados: RankingResposta; erro?: never } | { dados?: never; erro: string }
);

function ultimos30Dias(agora: number) {
  return { inicio: new Date(agora - 30 * DIA_MS), fim: new Date(agora) };
}

function parametros(filtros: Filtros, periodo: { inicio: Date; fim: Date }): RankingParams {
  const { metrica, agregacao } = METRICAS[filtros.metrica];
  return {
    metrica,
    agregacao,
    inicio: periodo.inicio.toISOString(),
    fim: periodo.fim.toISOString(),
    ordenacao: filtros.ordenacao,
    aplicacaoId: filtros.escopo ? Number(filtros.escopo) : undefined,
    limite: LIMITE,
    offset: 0,
  };
}

function medida(valor: number | null, unidade: "kWh" | "kg CO₂e") {
  if (valor === null) return "—";
  const convertido = unidade === "kWh" ? valor : valor / 1000;
  const casas = convertido > 0 ? Math.min(20, Math.max(2, 1 - Math.floor(Math.log10(convertido)))) : 2;
  return `${convertido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: casas })} ${unidade}`;
}

function valores(item: RankingItem, agregacao: RankingParams["agregacao"]) {
  if (agregacao === "media") {
    return { energia: medida(item.mediaEnergiaKwh, "kWh"), co2e: medida(item.mediaEmissaoCo2eG, "kg CO₂e") };
  }
  return { energia: medida(item.totalEnergiaKwh, "kWh"), co2e: medida(item.totalEmissaoCo2eG, "kg CO₂e") };
}

const formatarTendencia = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

function Tendencia({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="ranking-sem-base">— Sem base de comparação</span>;
  return <span className="ranking-variacao" data-reducao={valor < 0 || undefined}>{formatarTendencia.format(valor)}%</span>;
}

function NavegacaoRanking() {
  return (
    <aside className="dash-sidebar">
      <a className="dash-brand" href={ROTAS.inicio}><img src={logo} alt="" /><span>GreenER</span></a>
      <p className="dash-nav-label">MENU PRINCIPAL</p>
      <a className="dash-nav-item" href={ROTAS.dashboard}><span aria-hidden="true">▦</span> Visão geral</a>
      <a className="dash-nav-item" href={ROTAS.historico}><span aria-hidden="true">⎔</span> Histórico</a>
      <a className="dash-nav-item dash-nav-active" href={ROTAS.ranking} aria-current="page"><span aria-hidden="true">▤</span> Ranking</a>
      <a className="dash-nav-item" href={ROTAS.comparacao}><span aria-hidden="true">⇄</span> Comparação</a>
      <a className="dash-nav-item" href={ROTAS.mapa}><span aria-hidden="true">◍</span> Mapa</a>
      <div className="dash-sidebar-bottom"><span className="dash-avatar">GE</span><span><strong>GreenER</strong><small>Monitoramento ambiental</small></span></div>
      <BotaoSair />
    </aside>
  );
}

function ClassificacaoRanking({ dados, agregacao, offset }: Pick<RankingResposta, "dados" | "agregacao"> & { offset: number }) {
  const contexto = agregacao === "media" ? "por coleta" : "total";
  return (
    <>
      <table className="ranking-tabela" aria-labelledby="ranking-classificacao">
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">Serviço / Projeto</th>
            <th scope="col">Energia {contexto}</th>
            <th scope="col">CO₂e {contexto}</th>
            <th scope="col">Tendência</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((item, indice) => {
            const posicao = offset + indice + 1;
            const { energia, co2e } = valores(item, agregacao);
            return (
              <tr key={item.servicoId}>
                <td className="ranking-posicao" data-podio={posicao <= 3 || undefined}>{String(posicao).padStart(2, "0")}</td>
                <th scope="row">{item.nome}<small>{item.aplicacao}</small></th>
                <td>{energia}</td>
                <td>{co2e}</td>
                <td><Tendencia valor={item.tendenciaPercentual} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ol className="ranking-lista" start={offset + 1} role="list" aria-labelledby="ranking-classificacao">
        {dados.map((item, indice) => {
          const posicao = offset + indice + 1;
          const { energia, co2e } = valores(item, agregacao);
          return (
            <li key={item.servicoId}>
              <span className="ranking-posicao" data-podio={posicao <= 3 || undefined} aria-label={`Posição ${posicao}`}>{posicao}</span>
              <div className="ranking-servico">{item.nome}<small>{item.aplicacao}</small></div>
              <div className="ranking-lista-tendencia"><Tendencia valor={item.tendenciaPercentual} /></div>
              <div className="ranking-lista-medidas"><span>Energia · {energia}</span><span>CO₂e · {co2e}</span></div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function ResultadoRanking({ resultado, consulta, paginar }: {
  resultado: RankingResposta;
  consulta: RankingParams;
  paginar: (offset: number) => void;
}) {
  const { dados, periodo, metrica, agregacao, ordenacao, resumo } = resultado;
  const { primeiroColocado, menorEnergia, classificados, semDados } = resumo;
  const top = primeiroColocado && valores(primeiroColocado, agregacao);
  const contexto = agregacao === "media" ? "por coleta" : "no período";
  const pagina = Math.floor(consulta.offset / consulta.limite) + 1;
  const paginas = Math.max(1, Math.ceil(classificados / consulta.limite));
  const metricaLabel = metrica === "energia" ? "energia" : "CO₂e";

  return (
    <>
      <p className="ranking-periodo">
        <strong>Período aplicado</strong> {dataHora(Date.parse(periodo.inicio))} a {dataHora(Date.parse(periodo.fim))}
      </p>
      {classificados === 0 ? (
        <CartaoEstado
          tom="vazio"
          nivelTitulo={2}
          titulo="Nenhum serviço com dados no período"
          selo="Sem dados"
          descricao={`Sem valores de ${metricaLabel} para classificar.${semDados > 0 ? ` Serviços sem dados: ${numero(semDados, 0)}.` : ""}`}
          rodape="Selecione outro período ou escopo."
        />
      ) : (
        <>
          <section className="ranking-resumo" aria-label="Resumo do ranking">
            <div className="ranking-cartao ranking-resumo-energia">
              <span>Energia média por coleta</span><strong>{medida(resumo.mediaEnergiaKwh, "kWh")}</strong>
              <small>Média dos serviços avaliados</small>
            </div>
            <div className="ranking-cartao ranking-resumo-emissoes">
              <span>Emissões médias por coleta</span><strong>{medida(resumo.mediaEmissaoCo2eG, "kg CO₂e")}</strong>
              <small>Média dos serviços avaliados</small>
            </div>
            <div className="ranking-cartao">
              <span>Serviços no ranking</span><strong>{numero(classificados, 0)}</strong>
              <small>Com dados no período</small>
            </div>
            <div className="ranking-cartao ranking-resumo-menor">
              <span>Menor consumo médio</span><strong>{medida(menorEnergia?.mediaEnergiaKwh ?? null, "kWh")}</strong>
              <small>{menorEnergia ? `Por coleta · ${menorEnergia.nome}` : "Energia sem dados"}</small>
            </div>
          </section>
          {primeiroColocado && top && (
            <section className="ranking-top" aria-labelledby="ranking-lider">
              <div>
                <span className="ranking-top-selo">TOP 1</span>
                <h2 id="ranking-lider">{primeiroColocado.nome}</h2>
                <p>{primeiroColocado.aplicacao}</p>
              </div>
              <div className="ranking-top-info">
                <dl>
                  <div data-selecionada={metrica === "energia" || undefined}>
                    <dt>Energia {contexto}</dt><dd>{top.energia}</dd>
                  </div>
                  <div data-selecionada={metrica === "co2e" || undefined}>
                    <dt>CO₂e {contexto}</dt><dd>{top.co2e}</dd>
                  </div>
                </dl>
                <p className="ranking-top-tendencia">
                  <Tendencia valor={primeiroColocado.tendenciaPercentual} />
                  {primeiroColocado.tendenciaPercentual !== null && " vs. período anterior"}
                </p>
              </div>
            </section>
          )}
          <section className="ranking-classificacao" aria-labelledby="ranking-classificacao">
            <h2 id="ranking-classificacao">Classificação de serviços</h2>
            <p>{ordenacao === "ASC" ? "Menor" : "Maior"} {metrica === "energia" ? "consumo de energia" : "emissão de CO₂e"} {contexto}.</p>
            {semDados > 0 && (
              <p className="ranking-aviso">
                {numero(semDados, 0)} {semDados === 1 ? "serviço sem dados" : "serviços sem dados"} de {metricaLabel} no período.
              </p>
            )}
            <ClassificacaoRanking dados={dados} agregacao={agregacao} offset={consulta.offset} />
            {paginas > 1 && (
              <nav className="ranking-paginacao" aria-label="Paginação do ranking">
                <button type="button" disabled={pagina === 1} onClick={() => paginar(consulta.offset - consulta.limite)}>Anterior</button>
                <span>Página {pagina} de {paginas}</span>
                <button type="button" disabled={pagina >= paginas} onClick={() => paginar(consulta.offset + consulta.limite)}>Próxima</button>
              </nav>
            )}
          </section>
        </>
      )}
    </>
  );
}

export function RankingPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [consulta, setConsulta] = useState(() => parametros(FILTROS_INICIAIS, ultimos30Dias(Date.now())));
  const [resposta, setResposta] = useState<RespostaConsulta | null>(null);
  const [aplicacoes, setAplicacoes] = useState<RankingResposta["aplicacoes"]>([]);

  useEffect(() => {
    const controle = new AbortController();
    void consultarRanking(consulta, controle.signal).then(
      (dados) => {
        if (controle.signal.aborted) return;
        setAplicacoes(dados.aplicacoes.filter(({ nome }) => nome.trim().toLowerCase() !== "greener demo"));
        const { classificados } = dados.resumo;
        if (classificados > 0 && consulta.offset >= classificados) {
          const offset = Math.floor((classificados - 1) / consulta.limite) * consulta.limite;
          setConsulta((atual) => atual === consulta ? { ...consulta, offset } : atual);
          return;
        }
        setResposta({ consulta, dados });
      },
      () => {
        if (!controle.signal.aborted) {
          setResposta({ consulta, erro: "Não foi possível consultar os serviços no período aplicado." });
        }
      },
    );
    return () => controle.abort();
  }, [consulta]);

  const atual = resposta?.consulta === consulta ? resposta : null;
  const erroPeriodo = filtros.periodo === "personalizado"
    ? erroDoPeriodo({ ...filtros, periodo: "personalizado" })
    : null;

  function alterar(mudanca: Partial<Filtros>) {
    setFiltros((anterior) => ({ ...anterior, ...mudanca }));
  }

  function escolherPeriodo(periodo: Filtros["periodo"]) {
    if (periodo === "personalizado" && !filtros.inicio && !filtros.fim) {
      alterar({ periodo, inicio: paraCampoDataHora(new Date(consulta.inicio)), fim: paraCampoDataHora(new Date(consulta.fim)) });
      return;
    }
    alterar({ periodo });
  }

  function aplicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agora = Date.now();
    const periodo = filtros.periodo === "30d"
      ? ultimos30Dias(agora)
      : resolverPeriodo({ ...filtros, periodo: filtros.periodo }, agora);
    if ("erro" in periodo) return;
    setConsulta(parametros(filtros, periodo));
  }

  return (
    <div className="dash-shell ranking">
      <NavegacaoRanking />
      <main className="dash-main">
        <header className="dash-topbar">
          <div><span className="dash-breadcrumb">GreenER / </span><strong>Ranking</strong></div>
          {import.meta.env.MODE === "mock" && <span className="ranking-demo">Ambiente de demonstração</span>}
        </header>
        <div className="ranking-conteudo">
          <header className="ranking-cabecalho">
            <span>Monitoramento ambiental</span>
            <h1>Ranking</h1>
            <p>Compare o consumo de energia e as emissões dos serviços monitorados.</p>
          </header>

          <form className="ranking-filtros" aria-label="Filtros do ranking" onSubmit={aplicar}>
            <div className="ranking-filtro-periodo">
              <label htmlFor="ranking-filtro-periodo">Período</label>
              <select id="ranking-filtro-periodo" value={filtros.periodo} onChange={(e) => escolherPeriodo(e.target.value as Filtros["periodo"])}>
                <option value="30d">Últimos 30 dias</option>
                {ATALHOS_PERIODO.map(({ valor, rotulo }) => <option key={valor} value={valor}>{rotulo}</option>)}
              </select>
            </div>
            <div className="ranking-filtro-escopo">
              <label htmlFor="ranking-filtro-escopo">Escopo</label>
              <select id="ranking-filtro-escopo" value={filtros.escopo} onChange={(e) => alterar({ escopo: e.target.value })}>
                <option value="">Todos os projetos</option>
                {aplicacoes.map(({ id, nome }) => <option key={id} value={id}>{nome}</option>)}
              </select>
            </div>
            <div className="ranking-filtro-metrica">
              <label htmlFor="ranking-filtro-metrica">Métrica</label>
              <select id="ranking-filtro-metrica" value={filtros.metrica} onChange={(e) => alterar({ metrica: e.target.value as Filtros["metrica"] })}>
                <optgroup label="Média por coleta">
                  <option value="energiaMedia">Energia média</option>
                  <option value="co2eMedia">CO₂e médio</option>
                </optgroup>
                <optgroup label="Total no período">
                  <option value="energiaTotal">Energia total</option>
                  <option value="co2eTotal">CO₂e total</option>
                </optgroup>
              </select>
            </div>
            <div className="ranking-filtro-ordem">
              <label htmlFor="ranking-filtro-ordem">Ordem</label>
              <select id="ranking-filtro-ordem" value={filtros.ordenacao} onChange={(e) => alterar({ ordenacao: e.target.value as Filtros["ordenacao"] })}>
                <option value="ASC">Crescente</option>
                <option value="DESC">Decrescente</option>
              </select>
            </div>
            {filtros.periodo === "personalizado" && (
              <div className="ranking-filtro-datas">
                <label>
                  Início
                  <input
                    type="datetime-local"
                    value={filtros.inicio}
                    aria-invalid={erroPeriodo !== null}
                    aria-describedby={erroPeriodo ? "ranking-erro-periodo" : undefined}
                    onChange={(e) => alterar({ inicio: e.target.value })}
                  />
                </label>
                <label>
                  Fim
                  <input
                    type="datetime-local"
                    value={filtros.fim}
                    aria-invalid={erroPeriodo !== null}
                    aria-describedby={erroPeriodo ? "ranking-erro-periodo" : undefined}
                    onChange={(e) => alterar({ fim: e.target.value })}
                  />
                </label>
                {erroPeriodo && <p id="ranking-erro-periodo" role="alert">{erroPeriodo}</p>}
              </div>
            )}
            <button className="ranking-aplicar" type="submit" disabled={erroPeriodo !== null}>Aplicar filtros</button>
          </form>

          <div className="ranking-resultado" aria-busy={atual === null}>
            {atual === null && (
              <CartaoEstado tom="carregando" nivelTitulo={2} titulo="Carregando ranking" selo="Em consulta"
                descricao="Buscando as coletas do período aplicado." rodape="Aguarde a classificação." />
            )}
            {atual?.erro && (
              <CartaoEstado tom="erro" nivelTitulo={2} titulo="Erro ao carregar o ranking" selo="Falha na consulta"
                descricao={atual.erro} rodape="Repita a consulta com os filtros aplicados."
                acao={{ rotulo: "Tentar novamente", aoClicar: () => setConsulta({ ...consulta }) }} />
            )}
            {atual?.dados && (
              <ResultadoRanking resultado={atual.dados} consulta={consulta} paginar={(offset) => setConsulta({ ...consulta, offset })} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
