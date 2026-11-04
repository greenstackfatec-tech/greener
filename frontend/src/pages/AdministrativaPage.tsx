import { useCallback } from "react";
import { useNavigate } from "react-router";
import { ConsumoPorRecurso } from "../components/ConsumoPorRecurso.tsx";
import { GraficoConsumo } from "../components/GraficoConsumo.tsx";
import { IntervaloColeta } from "../components/IntervaloColeta.tsx";
import { LayoutAdministrativo } from "../components/LayoutAdministrativo.tsx";
import { ROTAS } from "../caminhos.ts";
import { sair } from "../services/auth.ts";
import { APLICACOES_MONITORADAS, CONSUMO_POR_RECURSO, formatarNumero } from "./administrativa-dados.ts";
import "./AdministrativaPage.css";

const ENERGIA_TOTAL_KWH = APLICACOES_MONITORADAS.reduce((soma, app) => soma + app.energiaKwh, 0);
const EMISSAO_TOTAL_KG = APLICACOES_MONITORADAS.reduce((soma, app) => soma + app.emissaoKgCo2e, 0);

/**
 * Área administrativa (DW21): visual do protótipo + configuração do intervalo de coleta.
 * Só abre com token: a barreira está em rotas.tsx (<RotaPrivada />).
 */
export function AdministrativaPage() {
  const navigate = useNavigate();

  // Estável (useCallback) porque o card do intervalo usa esta função como dependência de um efeito.
  const encerrarSessao = useCallback(() => {
    sair();
    navigate(ROTAS.login, { replace: true });
  }, [navigate]);

  return (
    <LayoutAdministrativo aoSair={encerrarSessao}>
      <h1 className="adm-titulo">Seu impacto, em foco.</h1>
      <p className="adm-subtitulo">Acompanhe o consumo e as emissões estimadas do seu software.</p>
      <div className="adm-periodo">
        <span className="adm-selo-dados">Dados de demonstração</span>
        <span>Últimos 7 dias · 21 a 27 set. 2026</span>
      </div>

      <div className="adm-indicadores">
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Energia estimada</p>
          <p className="adm-indicador-valor">{formatarNumero(ENERGIA_TOTAL_KWH, 1)} kWh</p>
          <p className="adm-indicador-apoio">Consumo das aplicações monitoradas</p>
        </article>
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Emissões estimadas</p>
          <p className="adm-indicador-valor">{formatarNumero(EMISSAO_TOTAL_KG, 2)} kg CO₂e</p>
          <p className="adm-indicador-apoio">Calculadas com fator regional ilustrativo</p>
        </article>
        <article className="adm-card adm-indicador">
          <p className="adm-indicador-rotulo">Aplicações ativas</p>
          <p className="adm-indicador-valor">{APLICACOES_MONITORADAS.length} aplicações</p>
          <p className="adm-indicador-apoio">CPU, RAM, disco e rede</p>
        </article>
      </div>

      <div className="adm-linha">
        {/* GraficoConsumo é o mesmo do painel de login; seus estilos (.grafico) estão em LayoutAutenticacao.css. */}
        <div className="adm-card adm-card-grafico">
          <GraficoConsumo />
        </div>
        <ConsumoPorRecurso itens={CONSUMO_POR_RECURSO} />
      </div>

      <section className="adm-card" aria-labelledby="aplicacoes-titulo">
        <h2 id="aplicacoes-titulo" className="adm-card-titulo">Aplicações monitoradas</h2>
        <p className="adm-card-legenda">{APLICACOES_MONITORADAS.length} aplicações · exemplos de monitoramento</p>
        <ul className="adm-aplicacoes">
          {APLICACOES_MONITORADAS.map((app) => (
            <li key={app.nome}>
              <div>
                <p className="adm-aplicacao-nome">{app.nome}</p>
                <p className="adm-aplicacao-estado">Ativa · região BR</p>
              </div>
              <div className="adm-aplicacao-valores">
                <strong>{formatarNumero(app.energiaKwh, 1)} kWh</strong>
                <span>{formatarNumero(app.emissaoKgCo2e, 2)} kg CO₂e</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Configuração (DW21). Este card não existe no Figma; ver nota no PR. */}
      <IntervaloColeta aoSessaoExpirada={encerrarSessao} />

      <p className="adm-nota">
        As estimativas dependem das métricas de infraestrutura e da intensidade de carbono da rede elétrica. Este
        protótipo usa dados simulados.
      </p>
    </LayoutAdministrativo>
  );
}
