import type { Situacao, Servico } from "./services/servicos.ts";
import { haQuanto } from "./formatacao.ts";

/** Textos de cada estado de serviço, iguais aos do mock DD07. */
export const TEXTOS_SITUACAO: Record<Situacao, { rotulo: string; selo: string; descricao: string }> = {
  ativo: { rotulo: "Ativo", selo: "Operacional", descricao: "Dados atuais recebidos" },
  indisponivel: {
    rotulo: "Indisponível",
    selo: "Sem resposta",
    descricao: "O serviço não respondeu à última tentativa",
  },
  sem_metricas: {
    rotulo: "Sem métricas",
    selo: "Aguardando dados",
    descricao: "A integração ainda não enviou dados",
  },
  // O DD07 não define "removido"; segue o tom neutro de "indisponível".
  removido: { rotulo: "Removido", selo: "Removido", descricao: "Serviço removido do monitoramento" },
};

/** Linha de rodapé do estado: "Última coleta há 4 min", "Sem leitura atual", "Aguardando primeira coleta". */
export function rodapeDaSituacao(servico: Servico, situacao: Situacao, agora: number): string {
  switch (situacao) {
    case "ativo": {
      const quando = haQuanto(servico.coletadoEm, agora);
      return quando ? `Última coleta ${quando}` : "Dados atuais recebidos";
    }
    case "indisponivel":
      return "Sem leitura atual";
    case "sem_metricas":
      return servico.coletadoEm ? "Sem métricas na última coleta" : "Aguardando primeira coleta";
    case "removido":
      return "Fora do monitoramento";
  }
}
