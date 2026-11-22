import { useMemo, useState, type ReactNode } from "react";
import { ROTAS } from "../caminhos.ts";
import logo from "../assets/greener-icon.png";
import { CartaoEstado } from "../components/CartaoEstado.tsx";
import { GloboServicos } from "../components/GloboServicos.tsx";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../config.ts";
import { TEXTOS_SITUACAO } from "../estadosServico.ts";
import { dataHora, duracao } from "../formatacao.ts";
import { useServicos } from "../hooks/useServicos.ts";
import { localizacaoDoServico, NAO_INFORMADO } from "../localizacao.ts";
import { agruparPorLocal, centroDosPontos, formatarCoordenada, separarPorCoordenadas } from "../mapa.ts";
import { situacaoDoServico } from "../services/servicos.ts";
import { BotaoSair } from "../components/BotaoSair.tsx";
import "./DashboardPage.css";
import "./MapaPage.css";

/** Tela do mapa (DW15 / RF13): globo com os serviços que têm latitude e longitude. */
export function MapaPage() {
  const { servicos, carregando, atualizando, erro, atualizadoEm, recarregar } = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  // O id fica no estado da tela: a atualização automática só troca os dados e o serviço aberto continua aberto (RF11).
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  const lista = useMemo(() => servicos ?? [], [servicos]);
  const { noMapa, foraDoMapa } = useMemo(() => separarPorCoordenadas(lista), [lista]);
  const grupos = useMemo(() => agruparPorLocal(noMapa), [noMapa]);
  const ordenados = useMemo(() => [...noMapa].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [noMapa]);
  // Se o serviço aberto sumir da lista (ou perder as coordenadas), o painel volta ao estado "nenhum aberto".
  const aberto = noMapa.find((s) => s.id === selecionadoId) ?? null;
  const mesmoLocal = aberto ? (grupos.find((g) => g.servicos.some((s) => s.id === aberto.id))?.servicos ?? []).filter((s) => s.id !== aberto.id) : [];
  const local = aberto ? localizacaoDoServico(aberto) : null;
  const situacao = aberto ? TEXTOS_SITUACAO[situacaoDoServico(aberto)] : null;
  const qtdFora = foraDoMapa.length;

  let corpo: ReactNode;
  if (servicos === null) {
    corpo = carregando ? (
      <div className="dash-estado">
        <CartaoEstado tom="carregando" titulo="Carregando" selo="Em atualização" descricao="Consultando os serviços e suas coordenadas" rodape="Buscando dados recentes" />
      </div>
    ) : (
      <div className="dash-estado">
        <CartaoEstado
          tom="erro" titulo="Erro de atualização" selo="Atenção"
          descricao={`Não foi possível carregar o mapa. ${erro ?? ""}`.trim()} valor={null}
          rodape="Nenhum dado anterior para mostrar" acao={{ rotulo: "Tentar de novo", aoClicar: recarregar }}
        />
      </div>
    );
  } else if (servicos.length === 0) {
    corpo = (
      <div className="dash-estado">
        <CartaoEstado tom="vazio" titulo="Estado vazio" selo="Primeiro passo" descricao="Nenhum serviço cadastrado" valor="Comece adicionando" rodape="Adicione um serviço para vê-lo no mapa" />
      </div>
    );
  } else {
    corpo = (
      <>
        {/* Falha com dados na tela: mantém o globo e avisa que a posição pode estar desatualizada (RNF04). */}
        {erro && (
          <div className="dash-aviso-erro" role="alert">
            <i aria-hidden="true" />
            <div>
              <strong>Erro de atualização</strong>
              <span>{erro} Os serviços abaixo podem estar desatualizados.</span>
              <small><button type="button" onClick={recarregar}>Tentar de novo</button></small>
            </div>
          </div>
        )}

        {/* Critério de pronto: a tela diz quantos serviços ficaram fora do mapa. */}
        <div className="mapa-aviso" data-completo={qtdFora === 0 ? "" : undefined} role="status">
          <p>
            {qtdFora === 0
              ? (noMapa.length === 1 ? "O único serviço tem latitude e longitude e aparece no mapa." : `Todos os ${noMapa.length} serviços têm latitude e longitude e aparecem no mapa.`)
              : `${qtdFora} ${qtdFora === 1 ? "serviço ficou" : "serviços ficaram"} fora do mapa por não ${qtdFora === 1 ? "ter" : "terem"} latitude e longitude. ${noMapa.length} ${noMapa.length === 1 ? "aparece" : "aparecem"} no globo.`}
            {qtdFora > 0 && <> {qtdFora === 1 ? "Ele continua" : "Eles continuam"} na <a href={ROTAS.dashboard}>Visão geral</a>.</>}
          </p>
          {qtdFora > 0 && (
            <details>
              <summary>Ver {qtdFora === 1 ? "qual" : "quais"}</summary>
              <ul>
                {foraDoMapa.map((s) => (
                  <li key={s.id}><strong>{s.nome}</strong> · {localizacaoDoServico(s).regiao === NAO_INFORMADO ? "Localização não informada" : localizacaoDoServico(s).regiao}</li>
                ))}
              </ul>
              {/* TODO (outra tarefa): botão "Informar coordenadas" do protótipo DD05. Depende de um endpoint de escrita
                  (PUT /services/:id/coordenadas) que ainda não existe no backend. */}
            </details>
          )}
        </div>

        <div className="mapa-grade">
          <section className="mapa-painel" aria-labelledby="mapa-servico-titulo">
            <h2 id="mapa-servico-titulo">Serviço no mapa</h2>
            <p className="mapa-ajuda">Clique em um pino do globo ou escolha na lista.</p>

            <label className="mapa-campo">
              <span>Serviço</span>
              <select value={aberto?.id ?? ""} onChange={(e) => setSelecionadoId(e.target.value === "" ? null : Number(e.target.value))} disabled={ordenados.length === 0}>
                <option value="">{ordenados.length === 0 ? "Nenhum serviço com coordenadas" : "Selecione um serviço"}</option>
                {ordenados.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </label>

            {aberto && local && situacao ? (
              <article className="mapa-detalhe" aria-live="polite">
                <header>
                  <h3>{aberto.nome}</h3>
                  <span className="mapa-selo" data-situacao={situacaoDoServico(aberto)}>{situacao.rotulo}</span>
                </header>
                <dl>
                  <div><dt>País</dt><dd>{local.pais}</dd></div>
                  <div><dt>Estado / região</dt><dd>{local.regiao}</dd></div>
                  <div><dt>Cidade</dt><dd>{local.cidade}</dd></div>
                  <div><dt>Latitude</dt><dd>{formatarCoordenada(aberto.latitude)}</dd></div>
                  <div><dt>Longitude</dt><dd>{formatarCoordenada(aberto.longitude)}</dd></div>
                </dl>
                <p className="mapa-origem">Coordenadas recebidas da API (<code>GET /api/services</code>). A posição no globo é aproximada.</p>
                {mesmoLocal.length > 0 && (
                  <div className="mapa-mesmo-local">
                    <span>Também neste local:</span>
                    {mesmoLocal.map((s) => <button key={s.id} type="button" onClick={() => setSelecionadoId(s.id)}>{s.nome}</button>)}
                  </div>
                )}
              </article>
            ) : (
              <p className="mapa-vazio">Nenhum serviço aberto. Os dados de localização aparecem aqui.</p>
            )}

            <ul className="mapa-legenda" aria-label="Legenda dos pinos">
              <li data-situacao="ativo"><i />Ativo</li>
              <li data-situacao="sem_metricas"><i />Sem métricas</li>
              <li data-situacao="indisponivel"><i />Indisponível ou removido</li>
            </ul>
          </section>

          <section className="mapa-globo" aria-labelledby="mapa-globo-titulo">
            <div className="mapa-globo-topo">
              <div><h2 id="mapa-globo-titulo">Explore o globo</h2><p>Arraste para girar. Cada pino é um serviço com coordenadas.</p></div>
              <span className="dash-count">{noMapa.length} no mapa</span>
            </div>
            <GloboServicos grupos={grupos} selecionadoId={aberto?.id ?? null} aoSelecionar={(s) => setSelecionadoId(s.id)} centroInicial={centroDosPontos(noMapa)} />
            <p className="mapa-rodape-globo">Globo vetorial ilustrativo: não usa mapa real nem imagens de satélite.</p>
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <a className="dash-brand" href={ROTAS.inicio}><img src={logo} alt="" /><span>GreenER</span></a>
        <p className="dash-nav-label">MENU PRINCIPAL</p>
        <a className="dash-nav-item" href={ROTAS.dashboard}><span aria-hidden="true">▦</span> Visão geral</a>
        <a className="dash-nav-item" href={ROTAS.historico}><span aria-hidden="true">⎔</span> Histórico</a>
        <a className="dash-nav-item" href={ROTAS.comparacao}><span aria-hidden="true">⇄</span> Comparação</a>
        <a className="dash-nav-item dash-nav-active" href={ROTAS.mapa} aria-current="page"><span aria-hidden="true">◍</span> Mapa</a>
        <div className="dash-sidebar-bottom"><span className="dash-avatar">GE</span><span><strong>GreenER</strong><small>Monitoramento ambiental</small></span></div>
        <BotaoSair />
      </aside>

      <main className="dash-main">
        <header className="dash-topbar"><div><span className="dash-breadcrumb">GreenER / </span><strong>Mapa</strong></div><div className="dash-live"><i /> Dados do monitoramento</div></header>
        <section className="dash-content">
          <div className="dash-heading">
            <div><p className="dash-eyebrow">MONITORAMENTO AMBIENTAL</p><h1>Mapa dos serviços</h1><p>Veja onde cada serviço está no planeta, pela latitude e longitude cadastradas.</p></div>
            <div className="dash-heading-acoes">
              <button className="dash-refresh" aria-label={atualizando ? "Atualizando dados" : "Atualizar dados"} aria-busy={atualizando} onClick={recarregar} disabled={atualizando || carregando}>↻ <span>{atualizando ? "Atualizando..." : "Atualizar dados"}</span></button>
              <p className="dash-atualizacao">{atualizadoEm === null ? "Aguardando a primeira atualização" : `Última atualização: ${dataHora(atualizadoEm)}`} · Atualiza a cada {duracao(INTERVALO_ATUALIZACAO_SEGUNDOS)}</p>
            </div>
          </div>
          <div className="mapa-corpo">{corpo}</div>
          <p className="dash-footnote">GreenER · Monitoramento de energia e emissões de CO₂e</p>
        </section>
      </main>
    </div>
  );
}
