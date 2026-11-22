import { useMemo, useState } from "react";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { CartaoEstado } from "../components/CartaoEstado.tsx";
import { BotaoSair } from "../components/BotaoSair.tsx";
import { ATALHOS_PERIODO, erroDoPeriodo, paraCampoDataHora, resolverPeriodo, type AtalhoPeriodo } from "../filtros.ts";
import { numero } from "../formatacao.ts";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../config.ts";
import { useServicos } from "../hooks/useServicos.ts";
import { useFiltrosAnalise } from "../hooks/useFiltrosAnalise.ts";
import {
  consultarComparacao,
  MAX_SERVICOS_COMPARACAO,
  MIN_SERVICOS_COMPARACAO,
  type Comparacao,
} from "../services/comparacao.ts";
import "./DashboardPage.css";
import "./ComparacaoPage.css";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Explica por que o botão "Comparar" está desabilitado; null quando a seleção é válida. */
function motivoBloqueio(qtdSelecionados: number, erroPeriodo: string | null): string | null {
  if (qtdSelecionados < MIN_SERVICOS_COMPARACAO) {
    return `Selecione pelo menos ${MIN_SERVICOS_COMPARACAO} serviços para comparar.`;
  }
  if (qtdSelecionados > MAX_SERVICOS_COMPARACAO) {
    return `Selecione no máximo ${MAX_SERVICOS_COMPARACAO} serviços.`;
  }
  return erroPeriodo;
}

/** Largura da barra em relação ao maior valor da coluna (0 a 100). */
function percentual(valor: number, maior: number): number {
  return maior > 0 ? Math.round((valor / maior) * 100) : 0;
}

export function ComparacaoPage() {
  const { servicos } = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  // O período é o mesmo do dashboard e do histórico (guardado na sessão pelo DW14).
  const { filtros, alterar } = useFiltrosAnalise();
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [resultado, setResultado] = useState<Comparacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Serviços removidos não têm coletas novas, então ficam fora da lista.
  const opcoes = useMemo(
    () => (servicos ?? []).filter((s) => s.status !== "removido").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [servicos],
  );

  const erroPeriodo = erroDoPeriodo(filtros);
  const bloqueio = motivoBloqueio(selecionados.length, erroPeriodo);
  const limiteAtingido = selecionados.length >= MAX_SERVICOS_COMPARACAO;

  function alternarServico(id: number) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  function escolherPeriodo(valor: AtalhoPeriodo) {
    if (valor === "personalizado" && !filtros.inicio && !filtros.fim) {
      const agora = Date.now();
      alterar({ periodo: valor, inicio: paraCampoDataHora(new Date(agora - DIA_MS)), fim: paraCampoDataHora(new Date(agora)) });
      return;
    }
    alterar({ periodo: valor });
  }

  async function comparar() {
    const periodo = resolverPeriodo(filtros, Date.now());
    if (bloqueio || "erro" in periodo) return;
    setCarregando(true);
    setErro(null);
    try {
      setResultado(await consultarComparacao(selecionados, periodo.inicio, periodo.fim));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a comparação.");
    } finally {
      setCarregando(false);
    }
  }

  const maiorEnergia = Math.max(0, ...(resultado?.itens.map((i) => i.totalEnergiaKwh) ?? []));
  const maiorCo2e = Math.max(0, ...(resultado?.itens.map((i) => i.totalEmissaoCo2eG) ?? []));

  let corpo;
  if (carregando) {
    corpo = (
      <div className="dash-estado">
        <CartaoEstado tom="carregando" titulo="Comparando" selo="Em atualização" descricao="Consultando os totais do período" rodape="Buscando dados" />
      </div>
    );
  } else if (erro) {
    corpo = (
      <div className="dash-estado">
        <CartaoEstado
          tom="erro"
          titulo="Erro na comparação"
          selo="Atenção"
          descricao={erro}
          valor={null}
          rodape="Nenhum dado para mostrar"
          acao={{ rotulo: "Tentar de novo", aoClicar: comparar, desabilitada: bloqueio !== null }}
        />
      </div>
    );
  } else if (resultado === null) {
    corpo = (
      <div className="dash-empty">
        <span>⇄</span>
        <strong>Escolha os serviços e o período</strong>
        <p>Selecione de {MIN_SERVICOS_COMPARACAO} a {MAX_SERVICOS_COMPARACAO} serviços e clique em "Comparar".</p>
      </div>
    );
  } else {
    corpo = (
      <div className="dash-table-wrap">
        <table className="dash-table comp-tabela">
          <thead>
            <tr><th>Serviço</th><th>Região</th><th>Coletas</th><th>Energia total</th><th>CO₂e total</th><th>Média por coleta</th></tr>
          </thead>
          <tbody>
            {resultado.itens.map((item) => (
              <tr key={item.servicoId}>
                <td>
                  <strong className="dash-service-name">{item.nome}</strong>
                  <small className="dash-service-id">ID {item.servicoId}</small>
                </td>
                <td>{item.regiao ?? "Não informado"}</td>
                {item.semDados ? (
                  <td colSpan={4}><span className="comp-sem-dados">Sem dados no período</span></td>
                ) : (
                  <>
                    <td>{item.qtdColetas}</td>
                    <td>
                      <span>{numero(item.totalEnergiaKwh, 4)} kWh</span>
                      <span className="comp-barra" aria-hidden="true"><i style={{ width: `${percentual(item.totalEnergiaKwh, maiorEnergia)}%` }} /></span>
                    </td>
                    <td>
                      <span>{numero(item.totalEmissaoCo2eG, 3)} g</span>
                      <span className="comp-barra comp-barra-co2e" aria-hidden="true"><i style={{ width: `${percentual(item.totalEmissaoCo2eG, maiorCo2e)}%` }} /></span>
                    </td>
                    <td>{numero(item.mediaEnergiaKwh, 4)} kWh · {numero(item.mediaEmissaoCo2eG, 3)} g</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <a className="dash-brand" href={ROTAS.inicio}><img src={logo} alt="" /><span>GreenER</span></a>
        <p className="dash-nav-label">MENU PRINCIPAL</p>
        <a className="dash-nav-item" href={ROTAS.dashboard}><span>▦</span> Visão geral</a>
        <a className="dash-nav-item" href={ROTAS.historico}><span>⎔</span> Histórico</a>
        <a className="dash-nav-item" href={ROTAS.ranking}><span aria-hidden="true">▤</span> Ranking</a>
        <a className="dash-nav-item dash-nav-active" href={ROTAS.comparacao} aria-current="page"><span>⇄</span> Comparação</a>
        <a className="dash-nav-item" href={ROTAS.mapa}><span aria-hidden="true">◍</span> Mapa</a>
        <div className="dash-sidebar-bottom"><span className="dash-avatar">GE</span><span><strong>GreenER</strong><small>Monitoramento ambiental</small></span></div>
        <BotaoSair />
      </aside>

      <main className="dash-main">
        <header className="dash-topbar"><div><span className="dash-breadcrumb">GreenER / </span><strong>Comparação</strong></div></header>
        <section className="dash-content">
          <div className="dash-heading">
            <div>
              <p className="dash-eyebrow">MONITORAMENTO AMBIENTAL</p>
              <h1>Comparação de serviços</h1>
              <p>Compare energia e CO₂e de {MIN_SERVICOS_COMPARACAO} a {MAX_SERVICOS_COMPARACAO} serviços no mesmo período.</p>
            </div>
          </div>

          <section className="dash-panel">
            <div className="dash-panel-heading">
              <div><h2>Serviços e período</h2><p>Os totais consideram todas as coletas do período escolhido.</p></div>
              <span className="dash-count">{selecionados.length} de {MAX_SERVICOS_COMPARACAO} selecionados</span>
            </div>

            <fieldset className="comp-servicos">
              <legend>Serviços</legend>
              {servicos === null && <p className="comp-nota">Carregando serviços...</p>}
              {servicos !== null && opcoes.length === 0 && <p className="comp-nota">Nenhum serviço cadastrado.</p>}
              {opcoes.map((s) => {
                const marcado = selecionados.includes(s.id);
                return (
                  <label key={s.id} className={marcado ? "comp-opcao marcada" : "comp-opcao"}>
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && limiteAtingido}
                      onChange={() => alternarServico(s.id)}
                    />
                    {s.nome}
                  </label>
                );
              })}
            </fieldset>

            <div className="comp-periodo">
              <label>
                Período
                <select value={filtros.periodo} onChange={(e) => escolherPeriodo(e.target.value as AtalhoPeriodo)}>
                  {ATALHOS_PERIODO.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
                </select>
              </label>
              {filtros.periodo === "personalizado" && (
                <>
                  <label>
                    Início
                    <input type="datetime-local" value={filtros.inicio} aria-invalid={erroPeriodo !== null} onChange={(e) => alterar({ inicio: e.target.value })} />
                  </label>
                  <label>
                    Fim
                    <input type="datetime-local" value={filtros.fim} aria-invalid={erroPeriodo !== null} onChange={(e) => alterar({ fim: e.target.value })} />
                  </label>
                </>
              )}
              <button
                type="button"
                className="comp-botao"
                onClick={comparar}
                disabled={bloqueio !== null || carregando}
                aria-describedby={bloqueio ? "comp-motivo" : undefined}
              >
                {carregando ? "Comparando..." : "Comparar"}
              </button>
            </div>
            {bloqueio && <p id="comp-motivo" className="comp-motivo">{bloqueio}</p>}

            {resultado && resultado.avisos.length > 0 && !carregando && !erro && (
              <ul className="comp-avisos">
                {resultado.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
              </ul>
            )}

            {corpo}
          </section>
          <p className="dash-footnote">GreenER · Monitoramento de energia e emissões de CO₂e</p>
        </section>
      </main>
    </div>
  );
}
