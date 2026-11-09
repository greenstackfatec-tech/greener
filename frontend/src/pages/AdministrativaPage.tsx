import { useCallback } from "react";
import { useNavigate } from "react-router";
import { ConsumoPorRecurso, type ItemRecurso } from "../components/ConsumoPorRecurso.tsx";
import { IntervaloColeta } from "../components/IntervaloColeta.tsx";
import { LayoutAdministrativo } from "../components/LayoutAdministrativo.tsx";
import { ResumoConsumoVisao } from "../components/ResumoConsumo.tsx";
import { ROTAS } from "../caminhos.ts";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../config.ts";
import { TEXTOS_SITUACAO } from "../estadosServico.ts";
import { dataHora, numero } from "../formatacao.ts";
import { useIndicadores, type EstadoIndicadores } from "../hooks/useIndicadores.ts";
import { useServicos } from "../hooks/useServicos.ts";
import { sair } from "../services/auth.ts";
import type { Indicadores } from "../services/indicadores.ts";
import { situacaoDoServico, type Servico } from "../services/servicos.ts";
import "./AdministrativaPage.css";

/**
 * Parcela do consumo por recurso (CPU, RAM, disco, rede).
 * TODO: nenhum endpoint devolve esse dado hoje. Quando o backend expuser (hoje a divisão só existe
 * dentro de calcularPotencia, em backend/src/calculos), troque `null` pela chamada à API.
 * Enquanto for `null`, o card avisa que o dado não está disponível, sem mostrar valores inventados.
 */
const CONSUMO_POR_RECURSO: ItemRecurso[] | null = null;

/** Últimos indicadores válidos: os atuais ou, se a última consulta falhou, os anteriores. */
function dadosDe(estado: EstadoIndicadores): Indicadores | null {
  if (estado.tipo === "ok") return estado.dados;
  if (estado.tipo === "erro") return estado.dadosAnteriores;
  return null;
}

function textoLocal(servico: Servico): string {
  const partes = [servico.regiao, servico.pais].filter((parte): parte is string => parte !== null);
  return partes.length > 0 ? partes.join(", ") : "Localização não informada";
}

/**
 * Área administrativa (DW21): indicadores e serviços reais (DW22) + configuração do intervalo de coleta.
 * Só abre com token: a barreira está em rotas.tsx (<RotaPrivada />).
 */
export function AdministrativaPage() {
  const navigate = useNavigate();
  const indicadores = useIndicadores(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);
  const servicos = useServicos(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000);

  // Estável (useCallback) porque o card do intervalo usa esta função como dependência de um efeito.
  const encerrarSessao = useCallback(() => {
    sair();
    navigate(ROTAS.login, { replace: true });
  }, [navigate]);

  const carregandoIndicadores = indicadores.tipo === "carregando";
  const dados = dadosDe(indicadores);
  const semCalculo = dados !== null && dados.consumoTotalKwh === 0 && dados.emissaoTotalCo2eG === 0;

  /** Texto de apoio de cada card: a situação (carregando, sem dados, sem coletas) ou o texto padrão. */
  const apoio = (padrao: string, soTotais = false): string => {
    if (carregandoIndicadores) return "Carregando...";
    if (dados === null) return "Indisponível no momento";
    if (soTotais && semCalculo) return "Ainda sem coletas calculadas";
    return padrao;
  };

  // Serviço removido saiu do monitoramento; fica fora da lista (e também fora das contagens do backend).
  const monitorados = (servicos.servicos ?? []).filter((servico) => servico.status !== "removido");
  const atualizadoEm = servicos.atualizadoEm;

  return (
    <LayoutAdministrativo aoSair={encerrarSessao}>
      <h1 className="adm-titulo">Seu impacto, em foco.</h1>
      <p className="adm-subtitulo">Acompanhe o consumo e as emissões estimadas do seu software.</p>
      <div className="adm-periodo">
        <span className="adm-selo-dados">Dados do monitoramento</span>
        <span>
          Última coleta de cada serviço ·{" "}
          {atualizadoEm === null ? "aguardando a primeira atualização" : `atualizado em ${dataHora(atualizadoEm)}`}
        </span>
      </div>

      {indicadores.tipo === "erro" && (
        <div className="adm-aviso" data-tipo="erro" role="alert">
          <span>
            {dados === null
              ? "Não foi possível carregar os indicadores."
              : "Não foi possível atualizar os indicadores. Os valores abaixo podem estar desatualizados."}
          </span>
          <button type="button" className="adm-link" onClick={indicadores.recarregar}>Tentar de novo</button>
        </div>
      )}

      <div className="adm-indicadores" aria-busy={carregandoIndicadores}>
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Energia estimada</p>
          <p className="adm-indicador-valor">{dados === null ? "—" : `${numero(dados.consumoTotalKwh, 4)} kWh`}</p>
          <p className="adm-indicador-apoio">{apoio("Última coleta de cada serviço", true)}</p>
        </article>
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Emissões estimadas</p>
          <p className="adm-indicador-valor">{dados === null ? "—" : `${numero(dados.emissaoTotalCo2eG, 3)} g CO₂e`}</p>
          <p className="adm-indicador-apoio">{apoio("Calculadas com a intensidade de carbono da região", true)}</p>
        </article>
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Serviços ativos</p>
          <p className="adm-indicador-valor">
            {dados === null
              ? "—"
              : `${numero(dados.servicosAtivos, 0)} ${dados.servicosAtivos === 1 ? "serviço" : "serviços"}`}
          </p>
          <p className="adm-indicador-apoio">
            {apoio(`Indisponíveis na última coleta: ${numero(dados?.servicosIndisponiveis ?? 0, 0)}`)}
          </p>
        </article>
      </div>

      <div className="adm-linha">
        {/* ResumoConsumoVisao recebe o mesmo estado dos cards: uma consulta só. Estilos em LayoutAutenticacao.css. */}
        <div className="adm-card adm-card-grafico">
          <ResumoConsumoVisao estado={indicadores} />
        </div>
        <ConsumoPorRecurso itens={CONSUMO_POR_RECURSO} />
      </div>

      <section className="adm-card" aria-labelledby="aplicacoes-titulo" aria-busy={servicos.carregando}>
        <h2 id="aplicacoes-titulo" className="adm-card-titulo">Serviços monitorados</h2>
        <p className="adm-card-legenda">
          {servicos.servicos === null
            ? "Última coleta de cada serviço"
            : `${monitorados.length} ${monitorados.length === 1 ? "serviço" : "serviços"} · última coleta de cada um`}
        </p>

        {servicos.servicos === null && servicos.carregando && (
          <p className="adm-estado" role="status">Carregando serviços...</p>
        )}

        {servicos.erro !== null && (
          <div className="adm-aviso" data-tipo="erro" role="alert">
            <span>
              {servicos.servicos === null
                ? `Não foi possível carregar os serviços. ${servicos.erro}`
                : `Não foi possível atualizar os serviços. Os valores abaixo podem estar desatualizados. ${servicos.erro}`}
            </span>
            <button type="button" className="adm-link" onClick={servicos.recarregar}>Tentar de novo</button>
          </div>
        )}

        {servicos.servicos !== null && monitorados.length === 0 && (
          <p className="adm-estado" role="status">Nenhum serviço monitorado no momento.</p>
        )}

        {monitorados.length > 0 && (
          <ul className="adm-aplicacoes">
            {monitorados.map((servico) => (
              <li key={servico.id}>
                <div>
                  <p className="adm-aplicacao-nome">{servico.nome}</p>
                  <p className="adm-aplicacao-estado">
                    {TEXTOS_SITUACAO[situacaoDoServico(servico)].rotulo} · {textoLocal(servico)}
                  </p>
                </div>
                <div className="adm-aplicacao-valores">
                  <strong>{servico.energiaKwh === null ? "—" : `${numero(servico.energiaKwh, 4)} kWh`}</strong>
                  <span>{servico.emissaoCo2eG === null ? "—" : `${numero(servico.emissaoCo2eG, 3)} g CO₂e`}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Configuração (DW21). Este card não existe no Figma; ver nota no PR. */}
      <IntervaloColeta aoSessaoExpirada={encerrarSessao} />

      <p className="adm-nota">
        As estimativas dependem das métricas de infraestrutura e da intensidade de carbono da rede elétrica. Os
        valores vêm da última coleta de cada serviço; serviços sem coleta calculada não entram nos totais.
      </p>
    </LayoutAdministrativo>
  );
}
