import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { CartaoEstado, type MetricasRecurso } from "../components/CartaoEstado.tsx";
import { FiltrosAnalise } from "../components/FiltrosAnalise.tsx";
import { GraficoLinha, type PontoGrafico } from "../components/GraficoLinha.tsx";
import { regioesDisponiveis, resolverPeriodo } from "../filtros.ts";
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

/** Ordena pontos do mais antigo para o mais novo (gráfico precisa assim). */
function ordenarCronologico(a: PontoGrafico, b: PontoGrafico): number {
  return new Date(a.data).getTime() - new Date(b.data).getTime();
}

export function HistoricoPage() {
  const { servicos, carregando, atualizando, erro, atualizadoEm, recarregar } = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  const agora = useAgora();
  const { filtros, alterar: alterarFiltros, limpar: limparFiltros } = useFiltrosAnalise();

  // Estado do histórico
  const [historico, setHistorico] = useState<HistoricoResposta | null>(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const recarregarHistorico = useCallback(() => {
    setRefetchTrigger((t) => t + 1);
  }, []);

  const lista = useMemo(() => servicos ?? [], [servicos]);
  const regioes = useMemo(() => regioesDisponiveis(lista), [lista]);
  const opcoesServico = useMemo(() => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [lista]);

  // Serviço selecionado (ou o primeiro da lista se não houver filtro)
  const servicoSelecionado = useMemo(() => {
    if (filtros.servicoId !== null) {
      return lista.find((s) => s.id === filtros.servicoId) ?? null;
    }
    return lista.length > 0 ? lista[0] : null;
  }, [lista, filtros.servicoId]);

  // Resolve período a partir dos filtros
  const periodoResolvido = useMemo(() => resolverPeriodo(filtros, agora), [filtros, agora]);

  // Busca histórico quando serviço ou período mudam
  useEffect(() => {
    if (!servicoSelecionado || "erro" in periodoResolvido) {
      setHistorico(null);
      setErroHistorico(null);
      return;
    }

    let cancelado = false;
    const { inicio, fim } = periodoResolvido;
    const servicoId = servicoSelecionado.id;

    async function buscar() {
      setCarregandoHistorico(true);
      setErroHistorico(null);
      try {
        const dados = await consultarHistorico(servicoId, {
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          ordenacao: "ASC",
        });
        if (!cancelado) {
          setHistorico(dados);
        }
      } catch (e) {
        if (!cancelado) {
          const msg = e instanceof Error ? e.message : "Erro ao buscar histórico";
          setErroHistorico(msg);
          setHistorico(null);
        }
      } finally {
        if (!cancelado) setCarregandoHistorico(false);
      }
    }

    buscar();
    return () => { cancelado = true; };
  }, [servicoSelecionado?.id, periodoResolvido, agora, refetchTrigger]);

  // Prepara pontos para o gráfico (filtra apenas coletas com sucesso e valores válidos)
  const pontosGrafico = useMemo((): PontoGrafico[] => {
    if (!historico?.dados) return [];
    return historico.dados
      .filter((p) => p.statusColeta === "sucesso" && (p.energiaKwh !== null || p.emissaoCo2eG !== null))
      .map(paraPontoGrafico)
      .sort(ordenarCronologico);
  }, [historico]);

  const ultimaAtualizacao = haQuanto(atualizadoEm, agora);

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
          titulo="Estado vazio"
          selo="Primeiro passo"
          descricao="Nenhum serviço cadastrado"
          valor="Comece adicionando"
          rodape="Adicione um serviço para ver o histórico"
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
          descricao="O serviço selecionado não existe ou foi removido"
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
  } else if (erroHistorico) {
    // Erro ao buscar histórico
    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="erro"
          titulo="Erro ao carregar histórico"
          selo="Atenção"
          descricao={erroHistorico}
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
  } else if (pontosGrafico.length === 0) {
    // Sem dados no período
    const periodoTexto = periodoResolvido && "inicio" in periodoResolvido
      ? `${new Date(periodoResolvido.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} a ${new Date(periodoResolvido.fim).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
      : "período selecionado";

    corpo = (
      <div className="hist-estado">
        <CartaoEstado
          tom="vazio"
          titulo="Sem dados no período"
          selo="Histórico vazio"
          descricao={`O serviço "${servicoSelecionado.nome}" não possui coletas com métricas no período: ${periodoTexto}`}
          valor="Nenhum ponto para exibir"
          rodape="Tente ampliar o período ou verifique se houve coletas"
        />
      </div>
    );
  } else {
    // Tem dados - mostra o gráfico
    const estado = situacaoDoServico(servicoSelecionado);
    const textos = TEXTOS_SITUACAO[estado];
    const metricas: MetricasRecurso = {
      cpuPercentual: servicoSelecionado.cpuPercentual,
      memoriaGb: servicoSelecionado.memoriaGb,
      discoGb: servicoSelecionado.discoGb,
      redeGb: servicoSelecionado.redeGb,
    };

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

    // Período formatado para o gráfico
    const periodoFormatado = `${new Date(periodoResolvido.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} a ${new Date(periodoResolvido.fim).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;

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
          altura={340}
          vazioTexto="Nenhum dado de coleta com métricas válidas no período."
        />
      </section>
    );

    corpo = (
      <>
        {resumoServico}
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
            <FiltrosAnalise
              filtros={filtros}
              servicos={opcoesServico}
              regioes={regioes}
              aoAlterar={alterarFiltros}
              aoLimpar={limparFiltros}
            />
            <p className="hist-filtros-nota">O gráfico mostra apenas coletas com status "sucesso" e métricas válidas.</p>

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