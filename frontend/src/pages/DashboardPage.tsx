import { useMemo, useState, type ReactNode } from "react";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { CartaoEstado } from "../components/CartaoEstado.tsx";
import { CardsIndicadores } from "../components/CardsIndicadores.tsx";
import { FiltrosAnalise } from "../components/FiltrosAnalise.tsx";
import { filtrarPorServicoERegiao, regioesDisponiveis } from "../filtros.ts";
import { TEXTOS_SITUACAO, rodapeDaSituacao } from "../estadosServico.ts";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../config.ts";
import { dataHora, duracao, haQuanto, numero } from "../formatacao.ts";
import { useAgora } from "../hooks/useAgora.ts";
import { useServicos } from "../hooks/useServicos.ts";
import { useIndicadores } from "../hooks/useIndicadores.ts";
import { useMonitoramentoColeta } from "../hooks/useMonitoramentoColeta.ts";
import { useFiltrosAnalise } from "../hooks/useFiltrosAnalise.ts";
import { situacaoDoServico, type Servico } from "../services/servicos.ts";
import { localizacaoDoServico, NAO_INFORMADO } from "../localizacao.ts";
import "./DashboardPage.css";

type Ordem = "nome" | "energia" | "co2e";

const COMPARAR: Record<Ordem, (a: Servico, b: Servico) => number> = {
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  // Maior primeiro; serviço sem valor vai para o fim.
  energia: (a, b) => (b.energiaKwh ?? -1) - (a.energiaKwh ?? -1),
  co2e: (a, b) => (b.emissaoCo2eG ?? -1) - (a.emissaoCo2eG ?? -1),
};

export function DashboardPage() {
  const { servicos, carregando, atualizando, erro, atualizadoEm, recarregar } = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  const agora = useAgora();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [visao, setVisao] = useState<"cartoes" | "tabela">("cartoes");
  const [ordem, setOrdem] = useState<Ordem>("nome");
  // Filtros, ordem e visão ficam no estado da tela: a atualização automática só troca os dados (RF11).
  const { filtros, alterar: alterarFiltros, limpar: limparFiltros } = useFiltrosAnalise();
  const indicadores = useIndicadores(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  const recarregarIndicadores = indicadores.recarregar;
  const { statusColeta, erroMonitoramento, atualizarMonitoramento } = useMonitoramentoColeta();
  const erroColeta = statusColeta?.monitoramento.situacao === "degradado"
    ? statusColeta.monitoramento.falhasAtivas.map((falha) =>
      `${falha.servicoNome ? `${falha.servicoNome}: ` : ""}${falha.mensagem}`,
    ).join(" ") || "A coleta apresentou falhas. Os dados podem estar desatualizados."
    : null;
  const erroExibido = [erro, erroMonitoramento, erroColeta].filter(Boolean).join(" ");
  const atualizar = () => { recarregar(); atualizarMonitoramento(); recarregarIndicadores(); };

  const lista = useMemo(() => servicos ?? [], [servicos]);

  const regioes = useMemo(() => regioesDisponiveis(lista), [lista]);
  const opcoesServico = useMemo(() => [...lista].sort(COMPARAR.nome), [lista]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return filtrarPorServicoERegiao(lista, filtros).filter((s) => {
      const corresponde = `${s.nome} ${s.cidade ?? ""} ${s.regiao ?? ""} ${s.pais ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo);
      return corresponde && (filtro === "todos" || situacaoDoServico(s) === filtro);
    }).sort(COMPARAR[ordem]);
  }, [lista, filtros, busca, filtro, ordem]);

  const ultimaAtualizacao = haQuanto(atualizadoEm, agora);

  let corpo: ReactNode;
  if (servicos === null) {
    corpo = carregando ? (
      <div className="dash-estado">
        <CartaoEstado tom="carregando" titulo="Carregando" selo="Em atualização" descricao="Consultando as métricas mais recentes" rodape="Buscando dados recentes" />
      </div>
    ) : (
      <div className="dash-estado">
        <CartaoEstado
          tom="erro"
          titulo="Erro de atualização"
          selo="Atenção"
          descricao={`Falha na coleta mais recente. ${erroExibido}`.trim()}
          valor={null}
          rodape="Nenhum dado anterior para mostrar"
          acao={{ rotulo: "Tentar de novo", aoClicar: atualizar }}
        />
      </div>
    );
  } else if (servicos.length === 0) {
    corpo = (
      <div className="dash-estado">
        <CartaoEstado tom="vazio" titulo="Estado vazio" selo="Primeiro passo" descricao="Nenhum serviço cadastrado" valor="Comece adicionando" rodape="Adicione um serviço para acompanhar métricas" />
      </div>
    );
  } else if (filtrados.length === 0) {
    corpo = (
      <div className="dash-empty">
        <span>⌕</span>
        <strong>Nenhum serviço encontrado</strong>
        <p>Ajuste a busca ou os filtros para ver os serviços.</p>
      </div>
    );
  } else {
    corpo = visao === "cartoes" ? (
      <div className={erroExibido ? "dash-cartoes desatualizado" : "dash-cartoes"}>
        {filtrados.map((s) => {
          const estado = situacaoDoServico(s);
          const textos = TEXTOS_SITUACAO[estado];
          return (
            <CartaoEstado
              key={s.id}
              tom={estado === "removido" ? "indisponivel" : estado}
              titulo={s.nome}
              selo={textos.selo}
              descricao={textos.descricao}
              valor={s.energiaKwh === null ? null : `${numero(s.energiaKwh, 4)} kWh`}
              rodape={rodapeDaSituacao(s, estado, agora)}
              localizacao={localizacaoDoServico(s)}
            />
          );
        })}
      </div>
    ) : (
      <div className={erroExibido ? "dash-table-wrap desatualizado" : "dash-table-wrap"}>
        <table className="dash-table">
          <thead>
            <tr><th>Serviço</th><th>Estado</th><th>País</th><th>Região</th><th>Cidade</th><th>CPU</th><th>RAM</th><th>Disco</th><th>Rede</th><th>Energia</th><th>CO₂e</th></tr>
          </thead>
          <tbody>
            {filtrados.map((s) => {
              const estado = situacaoDoServico(s);
              const local = localizacaoDoServico(s);
              return (
                <tr key={s.id}>
                  <td><strong className="dash-service-name">{s.nome}</strong><small className="dash-service-id">ID {s.id}</small></td>
                  <td><span className={`dash-status ${estado}`}><i />{TEXTOS_SITUACAO[estado].rotulo}</span></td>
                  {([local.pais, local.regiao, local.cidade] as const).map((texto, i) => (
                    <td key={i} className={texto === NAO_INFORMADO ? "dash-sem-info" : "dash-location"}>{texto}</td>
                  ))}
                  <td>{numero(s.cpuPercentual)}{s.cpuPercentual === null ? "" : "%"}</td>
                  <td>{s.memoriaGb === null ? "—" : `${numero(s.memoriaGb)} GB`}</td>
                  <td>{s.discoGb === null ? "—" : `${numero(s.discoGb)} GB`}</td>
                  <td>{s.redeGb === null ? "—" : `${numero(s.redeGb)} GB`}</td>
                  <td className="dash-energia" data-situacao={estado}>
                    <span className="dash-energia-valor">{s.energiaKwh === null ? "—" : `${numero(s.energiaKwh, 4)} kWh`}</span>
                    <small>{rodapeDaSituacao(s, estado, agora)}</small>
                  </td>
                  <td>{s.emissaoCo2eG === null ? "—" : `${numero(s.emissaoCo2eG, 3)} g`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <a className="dash-brand" href={ROTAS.inicio}><img src={logo} alt=""/><span>GreenER</span></a>
        <p className="dash-nav-label">MENU PRINCIPAL</p>
        <a className="dash-nav-item dash-nav-active" href={ROTAS.dashboard}><span>▦</span> Visão geral</a>
        <a className="dash-nav-item" href="#servicos"><span>▤</span> Serviços</a>
        <div className="dash-sidebar-bottom"><span className="dash-avatar">GE</span><span><strong>GreenER</strong><small>Monitoramento ambiental</small></span></div>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar"><div><span className="dash-breadcrumb">GreenER / </span><strong>Visão geral</strong></div><div className="dash-live"><i/> Dados do monitoramento</div></header>
        <section className="dash-content">
          <div className="dash-heading">
            <div><p className="dash-eyebrow">MONITORAMENTO AMBIENTAL</p><h1>Visão geral</h1><p>Acompanhe o desempenho e o impacto ambiental dos seus serviços.</p></div>
            <div className="dash-heading-acoes">
              <button className="dash-refresh" aria-label={atualizando ? "Atualizando dados" : "Atualizar dados"} aria-busy={atualizando} onClick={atualizar} disabled={atualizando || carregando}>↻ <span>{atualizando ? "Atualizando..." : "Atualizar dados"}</span></button>
              <p className="dash-atualizacao">{atualizadoEm === null ? "Aguardando a primeira atualização" : `Última atualização: ${dataHora(atualizadoEm)}`} · Atualiza a cada {duracao(INTERVALO_ATUALIZACAO_SEGUNDOS)}</p>
            </div>
          </div>

          {/* Indicadores consolidados vindos do backend (DW06 / RF08). */}
          <CardsIndicadores estado={indicadores} aoTentarDeNovo={recarregarIndicadores} intervaloAtualizacaoSegundos={INTERVALO_ATUALIZACAO_SEGUNDOS} />

          <section className="dash-panel" id="servicos">
            <div className="dash-panel-heading"><div><h2>Serviços monitorados</h2><p>Indicadores individuais da última coleta disponível.</p></div>{servicos !== null && <span className="dash-count">{filtrados.length} serviços</span>}</div>
            <FiltrosAnalise filtros={filtros} servicos={opcoesServico} regioes={regioes} aoAlterar={alterarFiltros} aoLimpar={limparFiltros} />
            <p className="dash-filtros-nota">O período vale para o histórico, o ranking e a comparação; esta lista mostra a coleta mais recente de cada serviço.</p>
            <div className="dash-toolbar"><label className="dash-search"><span>⌕</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço ou localização..." aria-label="Buscar serviço ou localização"/></label><select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option value="todos">Todos os estados</option><option value="ativo">Ativos</option><option value="indisponivel">Indisponíveis</option><option value="sem_metricas">Sem métricas</option><option value="removido">Removidos</option></select><select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar serviços"><option value="nome">Nome (A–Z)</option><option value="energia">Maior consumo</option><option value="co2e">Maior emissão de CO₂e</option></select><div className="dash-visao" role="group" aria-label="Modo de exibição"><button type="button" aria-pressed={visao === "cartoes"} onClick={() => setVisao("cartoes")}>Cartões</button><button type="button" aria-pressed={visao === "tabela"} onClick={() => setVisao("tabela")}>Tabela</button></div></div>

            {/* Falha com dados já na tela: mantém a tabela e avisa que os valores podem estar desatualizados (RNF04). */}
            {erroExibido && servicos !== null && (
              <div className="dash-aviso-erro" role="alert">
                <i aria-hidden="true" />
                <div>
                  <strong>Erro de atualização</strong>
                  <span>Falha na coleta mais recente. {erroExibido} Os valores abaixo podem estar desatualizados.</span>
                  <small>{ultimaAtualizacao ? `Última atualização ${ultimaAtualizacao}` : "Sem atualização anterior"} · <button type="button" onClick={atualizar}>Tentar de novo</button></small>
                </div>
              </div>
            )}

            {corpo}
            <div className="dash-table-footer"><span>Valores referentes à coleta mais recente de cada serviço.</span><span>— Dados ainda não disponíveis</span></div>
          </section>
          <p className="dash-footnote">GreenER · Monitoramento de energia e emissões de CO₂e</p>
        </section>
      </main>
    </div>
  );
}
