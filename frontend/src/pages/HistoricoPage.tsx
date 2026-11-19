import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { CartaoEstado, type MetricasRecurso } from "../components/CartaoEstado.tsx";
import { FiltrosAnalise } from "../components/FiltrosAnalise.tsx";
import { GraficoLinha, type PontoGrafico } from "../components/GraficoLinha.tsx";
import { regioesDisponiveis, resolverPeriodo, filtrarPorServicoERegiao } from "../filtros.ts";
import { TEXTOS_SITUACAO, rodapeDaSituacao } from "../estadosServico.ts";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../config.ts";
import { dataHora, duracao, haQuanto, numero } from "../formatacao.ts";
import { useAgora } from "../hooks/useAgora.ts";
import { useServicos } from "../hooks/useServicos.ts";
import { useFiltrosAnalise } from "../hooks/useFiltrosAnalise.ts";
import { situacaoDoServico } from "../services/servicos.ts";
import { localizacaoDoServico } from "../localizacao.ts";
import { consultarHistorico, type HistoricoResposta, type PontoHistorico } from "../services/analytics.ts";
import "./HistoricoPage.css";

/** Converte PontoHistorico do backend para PontoGrafico do gráfico. */
function paraPontoGrafico(ph: PontoHistorico): PontoGrafico {
  return {
    data: ph.coletadoEm,
    energia: ph.energiaKwh,
    co2e: ph.emissaoCo2eG,
  };
}

/** Calcula estatísticas dos pontos para os cards de resumo. */
function calcularEstatisticas(pontos: PontoGrafico[]) {
  const energiaValida = pontos.map((p) => p.energia).filter((v): v is number => v !== null);
  const co2eValida = pontos.map((p) => p.co2e).filter((v): v is number => v !== null);

  const estatEnergia = energiaValida.length > 0 ? {
    atual: energiaValida[energiaValida.length - 1],
    media: energiaValida.reduce((a, b) => a + b, 0) / energiaValida.length,
    min: Math.min(...energiaValida),
    max: Math.max(...energiaValida),
    total: energiaValida.reduce((a, b) => a + b, 0),
    count: energiaValida.length,
  } : null;

  const estatCo2e = co2eValida.length > 0 ? {
    atual: co2eValida[co2eValida.length - 1],
    media: co2eValida.reduce((a, b) => a + b, 0) / co2eValida.length,
    min: Math.min(...co2eValida),
    max: Math.max(...co2eValida),
    total: co2eValida.reduce((a, b) => a + b, 0),
    count: co2eValida.length,
  } : null;

  return { energia: estatEnergia, co2e: estatCo2e };
}

/** Formata data relativa para exibição amigável. */
function formatarPeriodo(inicio: Date, fim: Date): string {
  const mesmoDia = inicio.toDateString() === fim.toDateString();
  if (mesmoDia) {
    return `${inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} – ${fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} a ${fim.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}

export function HistoricoPage() {
  const { servicos, carregando, atualizando, erro, atualizadoEm, recarregar } = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  const agora = useAgora();
  const { filtros, alterar: alterarFiltros, limpar: limparFiltros } = useFiltrosAnalise();

  // Estado do histórico (inclui servicoId para evitar mostrar dados do serviço anterior durante transição)
  const [historico, setHistorico] = useState<{ servicoId: number; dados: HistoricoResposta | null } | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const recarregarHistorico = useCallback(() => {
    setRefetchTrigger((t: number) => t + 1);
  }, []);

  const lista = useMemo(() => servicos ?? [], [servicos]);
  const regioes = useMemo(() => regioesDisponiveis(lista), [lista]);

  // Aplica filtros de serviço e região à lista
  const listaFiltrada = useMemo(() => filtrarPorServicoERegiao(lista, filtros), [lista, filtros]);
  const opcoesServico = useMemo(() => [...listaFiltrada].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [listaFiltrada]);

  // Serviço selecionado (ou o primeiro ativo da lista filtrada se não houver filtro)
  const servicoSelecionado = useMemo(() => {
    if (filtros.servicoId !== null) {
      return lista.find((s) => s.id === filtros.servicoId) ?? null;
    }
    // Prioriza serviços ativos na lista filtrada; se não houver, pega o primeiro da lista filtrada
    const ativo = listaFiltrada.find((s) => s.status === "ativo");
    return ativo ?? (listaFiltrada.length > 0 ? listaFiltrada[0] : null);
  }, [lista, listaFiltrada, filtros.servicoId]);

  // Resolve período a partir dos filtros
  const periodoResolvido = useMemo(() => resolverPeriodo(filtros, agora), [filtros, agora]);

  // Busca histórico quando serviço ou período mudam (limpa e busca)
  // Ao trocar de serviço ou período, limpa o histórico (mostra loading)
  // Usa valores primitivos como dependências para evitar re-fetch a cada 30s (useAgora)
  useEffect(() => {
    // Não busca se não há serviço selecionado ou período inválido
    if (!servicoSelecionado || "erro" in periodoResolvido) {
      return;
    }

    let cancelado = false;
    const { inicio, fim } = periodoResolvido;
    const servicoId = servicoSelecionado.id;

    async function buscar() {
      setHistorico({ servicoId, dados: null }); // Limpa imediatamente ao trocar serviço/período
      setErroHistorico(null);
      setCarregandoHistorico(true);
      try {
        const dados = await consultarHistorico(servicoId, {
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          ordenacao: "DESC",
        });
        if (!cancelado) {
          setHistorico({ servicoId, dados });
        }
      } catch (e) {
        if (!cancelado) {
          const msg = e instanceof Error ? e.message : "Erro ao buscar histórico";
          setErroHistorico(msg);
          setHistorico({ servicoId, dados: null });
        }
      } finally {
        if (!cancelado) setCarregandoHistorico(false);
      }
    }

    buscar();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependências primitivas intencionais para evitar refetch no useAgora
  }, [servicoSelecionado?.id, filtros.periodo, filtros.inicio, filtros.fim]);

  // Atualização manual ("Atualizar"): mantém gráfico anterior até resposta chegar
  useEffect(() => {
    if (!servicoSelecionado || "erro" in periodoResolvido) return;
    if (refetchTrigger === 0) return; // Ignora valor inicial

    let cancelado = false;
    const { inicio, fim } = periodoResolvido;
    const servicoId = servicoSelecionado.id;

    async function buscar() {
      setErroHistorico(null);
      setCarregandoHistorico(true);
      // NÃO limpa historico aqui - mantém gráfico anterior
      try {
        const dados = await consultarHistorico(servicoId, {
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          ordenacao: "DESC",
        });
        if (!cancelado) {
          setHistorico({ servicoId, dados });
        }
      } catch (e) {
        if (!cancelado) {
          const msg = e instanceof Error ? e.message : "Erro ao buscar histórico";
          setErroHistorico(msg);
        }
      } finally {
        if (!cancelado) setCarregandoHistorico(false);
      }
    }

    buscar();
    return () => { cancelado = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependências primitivas intencionais
  }, [refetchTrigger]);

  // Histórico válido: null se não há serviço selecionado, período inválido ou serviço não corresponde
  const historicoValido = (!servicoSelecionado || "erro" in periodoResolvido || historico?.servicoId !== servicoSelecionado.id) ? null : historico.dados ?? null;
  const erroHistoricoValido = (!servicoSelecionado || "erro" in periodoResolvido) ? null : erroHistorico;

  // Prepara pontos para o gráfico (filtra apenas coletas com sucesso e valores válidos)
  // Backend devolve DESC (mais recentes primeiro); inverte para ordem cronológica (mais antigo primeiro)
  const pontosGrafico = useMemo((): PontoGrafico[] => {
    if (!historicoValido?.dados) return [];
    return historicoValido.dados
      .filter((p: PontoHistorico) => p.statusColeta === "sucesso" && (p.energiaKwh !== null || p.emissaoCo2eG !== null))
      .map(paraPontoGrafico)
      .reverse(); // Inverte DESC -> ASC para o gráfico
  }, [historicoValido]);

  const ultimaAtualizacao = haQuanto(atualizadoEm, agora);
  const estatisticas = useMemo(() => calcularEstatisticas(pontosGrafico), [pontosGrafico]);
  const temDados = pontosGrafico.length > 0;

  // Determina o conteúdo principal
  let corpo: ReactNode;

  if (servicos === null) {
    // Carregando serviços
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="carregando"
          titulo="Carregando serviços"
          selo="Em atualização"
          descricao="Buscando lista de serviços"
          rodape="Aguarde..."
        />
      </div>
    );
  } else if (servicos.length === 0) {
    // Nenhum serviço cadastrado
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="vazio"
          titulo="Nenhum serviço cadastrado"
          selo="Primeiro passo"
          descricao="Adicione um serviço para começar a monitorar o consumo de energia e emissões de CO₂e."
          valor="Comece adicionando"
          rodape="Acesse a área administrativa para cadastrar seu primeiro serviço"
        />
      </div>
    );
  } else if (!servicoSelecionado) {
    // Serviço filtrado não encontrado
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="vazio"
          titulo="Serviço não encontrado"
          selo="Filtro ativo"
          descricao="O serviço selecionado não existe ou foi removido."
          valor="Ajuste o filtro"
          rodape="Escolha outro serviço no seletor acima"
        />
      </div>
    );
  } else if ("erro" in periodoResolvido) {
    // Período inválido
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="erro"
          titulo="Período inválido"
          selo="Atenção"
          descricao={periodoResolvido.erro}
          valor={null}
          rodape="Corrija o período no filtro personalizado"
        />
      </div>
    );
  } else if (erroHistoricoValido) {
    // Erro ao buscar histórico
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="erro"
          titulo="Erro ao carregar histórico"
          selo="Atenção"
          descricao={erroHistoricoValido}
          valor={null}
          rodape={ultimaAtualizacao ? `Última atualização ${ultimaAtualizacao}` : "Sem atualização anterior"}
          acao={{ rotulo: "Tentar de novo", aoClicar: recarregarHistorico }}
        />
      </div>
    );
  } else if (carregandoHistorico) {
    // Carregando histórico
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="carregando"
          titulo="Carregando histórico"
          selo="Consultando dados"
          descricao={`Histórico de ${servicoSelecionado.nome}`}
          rodape="Buscando coletas do período"
        />
      </div>
    );
  } else if (!temDados) {
    // Sem dados no período
    const periodoTexto = periodoResolvido && "inicio" in periodoResolvido
      ? formatarPeriodo(periodoResolvido.inicio, periodoResolvido.fim)
      : "período selecionado";

    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="vazio"
          titulo="Sem dados no período"
          selo="Histórico vazio"
          descricao={`O serviço "${servicoSelecionado.nome}" não possui coletas com métricas no período: ${periodoTexto}`}
          valor="Nenhum ponto para exibir"
          rodape="Tente ampliar o período ou verifique se houve coletas bem-sucedidas"
        />
      </div>
    );
  } else {
    // Tem dados - mostra o gráfico com cards de resumo
    const estado = situacaoDoServico(servicoSelecionado);
    const textos = TEXTOS_SITUACAO[estado];
    const metricas: MetricasRecurso = {
      cpuPercentual: servicoSelecionado.cpuPercentual,
      memoriaGb: servicoSelecionado.memoriaGb,
      discoGb: servicoSelecionado.discoGb,
      redeGb: servicoSelecionado.redeGb,
    };

    const periodoFormatado = periodoResolvido && "inicio" in periodoResolvido
      ? formatarPeriodo(periodoResolvido.inicio, periodoResolvido.fim)
      : "Período não disponível";

    // Card de resumo do serviço
    const resumoServico = (
      <div className="hist-resumo-servico" key="resumo">
        <CartaoEstado
          tom={estado === "removido" ? "indisponivel" : estado}
          titulo={servicoSelecionado.nome}
          selo={textos.selo}
          descricao={textos.descricao}
          valor={
            <>
              <span className="hist-valor-com-info">
                {servicoSelecionado.energiaKwh === null ? "—" : `${numero(servicoSelecionado.energiaKwh, 4)} kWh`}
              </span>
              {servicoSelecionado.emissaoCo2eG !== null && (
                <small className="hist-co2e-explicacao">
                  CO₂e: {numero(servicoSelecionado.emissaoCo2eG, 3)} g = energia × intensidade de carbono
                </small>
              )}
            </>
          }
          rodape={rodapeDaSituacao(servicoSelecionado, estado, agora)}
          localizacao={localizacaoDoServico(servicoSelecionado)}
          metricas={metricas}
          nivelTitulo={3}
        />
      </div>
    );

    // Cards de estatísticas do período
    const cardsEstatisticas = (
      <div className="hist-estatisticas" aria-label="Estatísticas do período">
        {estatisticas.energia && (
          <article className="hist-stat-card hist-stat-card--energia">
            <div className="hist-stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="hist-stat-content">
              <span className="hist-stat-label">Energia no período</span>
              <div className="hist-stat-valores">
                <span className="hist-stat-item" title="Valor da última coleta">
                  <span className="hist-stat-sublabel">Atual</span>
                  <strong>{numero(estatisticas.energia.atual, 4)}</strong>
                  <small>kWh</small>
                </span>
                <span className="hist-stat-divider" aria-hidden="true">|</span>
                <span className="hist-stat-item" title="Média do período">
                  <span className="hist-stat-sublabel">Média</span>
                  <strong>{numero(estatisticas.energia.media, 4)}</strong>
                  <small>kWh</small>
                </span>
                <span className="hist-stat-divider" aria-hidden="true">|</span>
                <span className="hist-stat-item" title="Total do período">
                  <span className="hist-stat-sublabel">Total</span>
                  <strong>{numero(estatisticas.energia.total, 4)}</strong>
                  <small>kWh</small>
                </span>
              </div>
              <div className="hist-stat-minmax">
                <span>Mín: <strong>{numero(estatisticas.energia.min, 4)} kWh</strong></span>
                <span>Máx: <strong>{numero(estatisticas.energia.max, 4)} kWh</strong></span>
                <span>{estatisticas.energia.count} ponto{estatisticas.energia.count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </article>
        )}
        {estatisticas.co2e && (
          <article className="hist-stat-card hist-stat-card--co2e">
            <div className="hist-stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16v.01" />
              </svg>
            </div>
            <div className="hist-stat-content">
              <span className="hist-stat-label">Emissões CO₂e no período</span>
              <div className="hist-stat-valores">
                <span className="hist-stat-item" title="Valor da última coleta">
                  <span className="hist-stat-sublabel">Atual</span>
                  <strong>{numero(estatisticas.co2e.atual, 3)}</strong>
                  <small>g</small>
                </span>
                <span className="hist-stat-divider" aria-hidden="true">|</span>
                <span className="hist-stat-item" title="Média do período">
                  <span className="hist-stat-sublabel">Média</span>
                  <strong>{numero(estatisticas.co2e.media, 3)}</strong>
                  <small>g</small>
                </span>
                <span className="hist-stat-divider" aria-hidden="true">|</span>
                <span className="hist-stat-item" title="Total do período">
                  <span className="hist-stat-sublabel">Total</span>
                  <strong>{numero(estatisticas.co2e.total, 3)}</strong>
                  <small>g</small>
                </span>
              </div>
              <div className="hist-stat-minmax">
                <span>Mín: <strong>{numero(estatisticas.co2e.min, 3)} g</strong></span>
                <span>Máx: <strong>{numero(estatisticas.co2e.max, 3)} g</strong></span>
                <span>{estatisticas.co2e.count} ponto{estatisticas.co2e.count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </article>
        )}
      </div>
    );

    // Gráfico
    const grafico = (
      <section className="hist-grafico" aria-labelledby="hist-grafico-titulo">
        <div className="hist-grafico-cabecalho">
          <div>
            <h2 id="hist-grafico-titulo">Evolução no período</h2>
            <p className="hist-grafico-periodo">
              {periodoFormatado} · {pontosGrafico.length} ponto{pontosGrafico.length !== 1 ? "s" : ""} de coleta
            </p>
          </div>
          <div className="hist-grafico-acoes">
            <button
              type="button"
              className="hist-grafico-botao"
              onClick={recarregarHistorico}
              disabled={carregandoHistorico}
              aria-label="Atualizar gráfico"
            >
              <span className="hist-grafico-botao-icone" aria-hidden="true">↻</span>
              <span>Atualizar</span>
            </button>
          </div>
        </div>
        <GraficoLinha
          pontos={pontosGrafico}
          altura={380}
          vazioTexto="Nenhum dado de coleta com métricas válidas no período."
          mostrarEstatisticas={false}
        />
      </section>
    );

    corpo = (
      <>
        {resumoServico}
        {cardsEstatisticas}
        {grafico}
      </>
    );
  }

  return (
    <div className="hist-shell">
      <aside className="hist-sidebar" aria-label="Navegação principal">
        <a className="hist-brand" href={ROTAS.inicio}>
          <img src={logo} alt="" />
          <span>GreenER</span>
        </a>
        <p className="hist-nav-label">MENU PRINCIPAL</p>
        <nav>
          <a className="hist-nav-item" href={ROTAS.dashboard}><span aria-hidden="true">▦</span> Visão geral</a>
          <a className="hist-nav-item hist-nav-active" href="#historico" aria-current="page"><span aria-hidden="true">⎔</span> Histórico</a>
        </nav>
        <div className="hist-sidebar-bottom">
          <span className="hist-avatar" aria-hidden="true">GE</span>
          <span><strong>GreenER</strong><small>Monitoramento ambiental</small></span>
        </div>
      </aside>

      <main className="hist-main" role="main">
        <header className="hist-topbar">
          <div>
            <span className="hist-breadcrumb">GreenER / </span>
            <strong>Histórico</strong>
          </div>
          <div className="hist-live" aria-live="polite" aria-atomic="true">
            <i aria-hidden="true" />
            Dados do monitoramento
          </div>
        </header>
        <div className="hist-content">
          <div className="hist-heading">
            <div>
              <p className="hist-eyebrow">MONITORAMENTO AMBIENTAL</p>
              <h1>Histórico de consumo</h1>
              <p>Acompanhe a evolução de energia e CO₂e de um serviço ao longo do tempo.</p>
            </div>
            <div className="hist-heading-acoes">
              <button
                className="hist-refresh"
                aria-label={atualizando ? "Atualizando dados" : "Atualizar dados"}
                aria-busy={atualizando}
                onClick={() => { recarregar(); }}
                disabled={atualizando || carregando}
              >
                <span className="hist-refresh-icone" aria-hidden="true">↻</span>
                <span>{atualizando ? "Atualizando..." : "Atualizar dados"}</span>
              </button>
              <p className="hist-atualizacao">
                {atualizadoEm === null
                  ? "Aguardando a primeira atualização"
                  : `Última atualização: ${dataHora(atualizadoEm)}`}
                · Atualiza a cada {duracao(INTERVALO_ATUALIZACAO_SEGUNDOS)}
              </p>
            </div>
          </div>

          <section className="hist-panel" id="historico" aria-labelledby="hist-panel-titulo">
            <div className="hist-panel-heading">
              <div>
                <h2 id="hist-panel-titulo">Filtros</h2>
                <p>Escolha o serviço e o período para visualizar o gráfico.</p>
              </div>
              {servicoSelecionado && (
                <span className="hist-servico-selecionado" aria-live="polite">
                  {servicoSelecionado.nome}
                </span>
              )}
            </div>

            <div className="hist-filtros-content">
              <FiltrosAnalise
                filtros={filtros}
                servicos={opcoesServico}
                regioes={regioes}
                aoAlterar={alterarFiltros}
                aoLimpar={limparFiltros}
              />
              <p className="hist-filtros-nota">O gráfico mostra apenas coletas com status "sucesso" e métricas válidas.</p>
            </div>

            {erro && servicos !== null && (
              <div className="hist-aviso-erro" role="alert">
                <i aria-hidden="true" />
                <div>
                  <strong>Erro de atualização</strong>
                  <span>Falha na coleta mais recente. {erro} Os valores abaixo podem estar desatualizados.</span>
                  <small>{ultimaAtualizacao ? `Última atualização ${ultimaAtualizacao}` : "Sem atualização anterior"} · <button type="button" onClick={() => { recarregar(); }}>Tentar de novo</button></small>
                </div>
              </div>
            )}

            <div className="hist-corpo">{corpo}</div>
          </section>
          <p className="hist-footnote">GreenER · Monitoramento de energia e emissões de CO₂e</p>
        </div>
      </main>
    </div>
  );
}