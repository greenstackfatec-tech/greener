import { CartaoEstado } from "../components/CartaoEstado.tsx";
import { TEXTOS_SITUACAO } from "../estadosServico.ts";
import "./EstadosPage.css";

/**
 * Galeria dos seis estados do DD07 para conferir lado a lado com o mock
 * (docs/design/DD07 estados de interface .png). Só existe em desenvolvimento (ver rotas.tsx).
 */
export function EstadosPage() {
  const { ativo, indisponivel, sem_metricas: semMetricas } = TEXTOS_SITUACAO;
  return (
    <div className="estados-pagina">
      <p className="estados-trilha">GREENer / EXPERIÊNCIA DE INTERFACE</p>
      <h1>Estados de interface</h1>
      <p className="estados-sub">Como o dashboard se comporta em cada cenário de coleta.</p>
      <div className="estados-grade">
        <CartaoEstado tom="ativo" titulo={ativo.rotulo} selo={ativo.selo} descricao={ativo.descricao} valor="2.486 kWh" rodape="Última coleta há 4 min" />
        <CartaoEstado tom="indisponivel" titulo={indisponivel.rotulo} selo={indisponivel.selo} descricao={indisponivel.descricao} valor={null} rodape="Sem leitura atual" />
        <CartaoEstado tom="sem_metricas" titulo={semMetricas.rotulo} selo={semMetricas.selo} descricao={semMetricas.descricao} valor={null} rodape="Aguardando primeira coleta" />
        <CartaoEstado tom="carregando" titulo="Carregando" selo="Em atualização" descricao="Consultando as métricas mais recentes" rodape="Buscando dados recentes" />
        <CartaoEstado tom="erro" titulo="Erro de atualização" selo="Atenção" descricao="Falha na coleta mais recente" valor="2.486 kWh" rodape="Última atualização há 28 min" acao={{ rotulo: "Tentar de novo", aoClicar: () => undefined }} />
        <CartaoEstado tom="vazio" titulo="Estado vazio" selo="Primeiro passo" descricao="Nenhum serviço cadastrado" valor="Comece adicionando" rodape="Adicione um serviço para acompanhar métricas" />
      </div>
    </div>
  );
}
