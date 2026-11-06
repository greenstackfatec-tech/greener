import { useCallback, useMemo, useState } from "react";
import { type Servico, situacaoDoServico } from "../services/servicos.ts";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { useServicos } from "../hooks/useServicos.ts";
import { useMonitoramentoColeta } from "../hooks/useMonitoramentoColeta.ts";
import "./DashboardPage.css";

function formatarNumero(valor: number | null, casas = 1): string {
  return valor === null || !Number.isFinite(valor) ? "—" : valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function situacao(servico: Servico): "ativo" | "indisponivel" | "sem_metricas" | "removido" {
  if (servico.status === "removido") return "removido";
  if (servico.status === "indisponivel" || servico.statusColeta === "indisponivel") return "indisponivel";
  if (servico.statusColeta === null) return "ativo";
  if (servico.statusColeta !== "sucesso") return "sem_metricas";
  return "ativo";
}

export function DashboardPage() {
  const { servicos, carregando, atualizando, erro, recarregar } = useServicos();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const { atualizarMonitoramento } = useMonitoramentoColeta();

  const carregar = useCallback(async () => {
    // useServicos gerencia o estado internamente; recarregar dispara nova busca
    await recarregar();
  }, [recarregar]);

  const contagem = useMemo(() => {
    const lista = servicos ?? [];
    return {
      total: lista.filter((s) => s.status !== "removido").length,
      ativos: lista.filter((s) => situacaoDoServico(s) === "ativo").length,
      indisponiveis: lista.filter((s) => situacaoDoServico(s) === "indisponivel").length,
      semMetricas: lista.filter((s) => situacaoDoServico(s) === "sem_metricas").length,
    };
  }, [servicos]);

  const filtrados = useMemo(() => {
    const lista = servicos ?? [];
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return lista.filter((s) => {
      const corresponde = `${s.nome} ${s.cidade ?? ""} ${s.regiao ?? ""} ${s.pais ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo);
      return corresponde && (filtro === "todos" || situacao(s) === filtro);
    });
  }, [servicos, busca, filtro]);

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
          <div className="dash-heading"><div><p className="dash-eyebrow">MONITORAMENTO AMBIENTAL</p><h1>Visão geral</h1><p>Acompanhe o desempenho e o impacto ambiental dos seus serviços.</p></div><button className="dash-refresh" onClick={() => { void carregar(); void atualizarMonitoramento(); }} disabled={atualizando}>↻ <span>{atualizando ? "Atualizando..." : "Atualizar dados"}</span></button></div>

          <div className="dash-summary">
            <article className="dash-summary-card"><span className="dash-summary-icon green">▤</span><div><small>Serviços monitorados</small><strong>{formatarNumero(contagem.total, 0)}</strong><em>Serviços cadastrados</em></div></article>
            <article className="dash-summary-card"><span className="dash-summary-icon green">✓</span><div><small>Ativos</small><strong>{formatarNumero(contagem.ativos, 0)}</strong><em className="positive">Em operação</em></div></article>
            <article className="dash-summary-card"><span className="dash-summary-icon gray">!</span><div><small>Indisponíveis</small><strong>{formatarNumero(contagem.indisponiveis, 0)}</strong><em>Sem resposta na coleta</em></div></article>
            <article className="dash-summary-card"><span className="dash-summary-icon blue">◷</span><div><small>Sem métricas</small><strong>{formatarNumero(contagem.semMetricas, 0)}</strong><em>Aguardando dados</em></div></article>
          </div>

          <section className="dash-panel" id="servicos">
            <div className="dash-panel-heading"><div><h2>Serviços monitorados</h2><p>Indicadores individuais da última coleta disponível.</p></div><span className="dash-count">{filtrados.length} serviços</span></div>
            <div className="dash-toolbar"><label className="dash-search"><span>⌕</span><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço ou localização..." aria-label="Buscar serviço ou localização"/></label><select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado"><option value="todos">Todos os estados</option><option value="ativo">Ativos</option><option value="indisponivel">Indisponíveis</option><option value="sem_metricas">Sem métricas</option><option value="removido">Removidos</option></select></div>
            {erro && <div className="dash-feedback error" role="alert"><strong>Não foi possível atualizar</strong><span>{erro}</span><button onClick={() => void carregar()}>Tentar novamente</button></div>}
            {carregando ? (
              <div className="dash-loading" aria-label="Carregando serviços"><span/><span/><span/></div>
            ) : !erro && filtrados.length === 0 ? (
              <div className="dash-empty"><span>⌕</span><strong>{servicos && servicos.length > 0 ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}</strong><p>{servicos && servicos.length > 0 ? "Ajuste a busca ou o filtro para ver os serviços." : "Os serviços aparecerão aqui assim que forem cadastrados e coletados."}</p></div>
            ) : !erro && (
              <div className="dash-table-wrap"><table className="dash-table"><thead><tr><th>Serviço</th><th>Estado</th><th>Localização</th><th>CPU</th><th>RAM</th><th>Disco</th><th>Rede</th><th>Energia</th><th>CO₂e</th></tr></thead><tbody>{filtrados.map((s) => { const estado = situacao(s); return <tr key={s.id}><td><strong className="dash-service-name">{s.nome}</strong><small className="dash-service-id">ID {s.id}</small></td><td><span className={`dash-status ${estado}`}><i/>{estado === "ativo" ? "Ativo" : estado === "indisponivel" ? "Indisponível" : estado === "removido" ? "Removido" : "Sem métricas"}</span></td><td><span className="dash-location">{s.cidade || s.regiao || "—"}</span><small className="dash-country">{[s.regiao, s.pais].filter(Boolean).join(", ")}</small></td><td>{formatarNumero(s.cpuPercentual)}{s.cpuPercentual === null ? "" : "%"}</td><td>{s.memoriaGb === null ? "—" : `${formatarNumero(s.memoriaGb)} GB`}</td><td>{s.discoGb === null ? "—" : `${formatarNumero(s.discoGb)} GB`}</td><td>{s.redeGb === null ? "—" : `${formatarNumero(s.redeGb)} GB`}</td><td>{s.energiaKwh === null ? "—" : `${formatarNumero(s.energiaKwh, 4)} kWh`}</td><td>{s.emissaoCo2eG === null ? "—" : `${formatarNumero(s.emissaoCo2eG, 3)} g`}</td></tr>; })}</tbody></table></div>
            )}
            <div className="dash-table-footer"><span>Valores referentes à coleta mais recente de cada serviço.</span><span>— Dados ainda não disponíveis</span></div>
          </section>
          <p className="dash-footnote">GreenER · Monitoramento de energia e emissões de CO₂e</p>
        </section>
      </main>
    </div>
  );
}
