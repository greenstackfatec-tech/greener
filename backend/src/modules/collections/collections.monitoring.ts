import { ErroApi, ErroConfiguracaoApi } from "../../integrations/api-client.ts";
import type { ContextoFalha, FalhaPublica } from "./collections.types.ts";

const mensagens = {
  descoberta: "Não foi possível atualizar a lista de serviços. A lista exibida pode estar desatualizada.",
  metricas: "As métricas deste serviço não puderam ser atualizadas.",
  carbono: "Métricas recebidas; cálculo de energia e CO₂e indisponível nesta coleta.",
  calculo: "Métricas recebidas; não foi possível concluir o cálculo desta coleta.",
  persistencia: "Não foi possível salvar a coleta. Uma nova tentativa será feita no próximo ciclo.",
  configuracao: "A configuração da coleta precisa ser verificada.",
};

export function criarFalhaPublica(erro: unknown, contexto: ContextoFalha, ocorridoEm: string): FalhaPublica {
  if (erro instanceof ErroConfiguracaoApi) contexto = { ...contexto, etapa: "configuracao" };
  const tipo = erro instanceof ErroApi ? erro.tipo : "interno";
  const prefixo = ["descoberta", "metricas", "carbono"].includes(contexto.etapa) ? "API_" : "COLETA_";
  return {
    ...contexto,
    tipo,
    codigo: `${prefixo}${contexto.etapa.toUpperCase()}_${tipo.toUpperCase()}`,
    mensagem: mensagens[contexto.etapa],
    ocorridoEm,
    ...(erro instanceof ErroApi && erro.statusHttp !== undefined ? { statusHttp: erro.statusHttp } : {}),
  };
}

interface Tentativa {
  contexto: ContextoFalha;
  geracao: number;
}

function chave(contexto: ContextoFalha): string {
  return JSON.stringify([contexto.etapa, contexto.idExterno ?? null]);
}

export function criarMonitoramentoColeta(agora: () => Date = () => new Date()) {
  const iniciadoEm = agora().toISOString();
  const tentativas = new Map<string, Tentativa>();
  const falhas = new Map<string, FalhaPublica>();
  const verificados = new Set<string>();
  let idsAtuais = new Set<string>();
  let geracao = 0;
  let ultimaTentativaDescobertaEm: string | null = null;
  let ultimaDescobertaValidaEm: string | null = null;
  let ultimaTentativaColetaEm: string | null = null;
  let ultimaColetaCompletaEm: string | null = null;

  function atual(tentativa: Tentativa): boolean {
    return tentativas.get(chave(tentativa.contexto))?.geracao === tentativa.geracao;
  }

  function presente(idExterno: string): boolean {
    return ultimaDescobertaValidaEm === null || idsAtuais.has(idExterno);
  }

  function concluir(tentativa: Tentativa) {
    if (!atual(tentativa)) return;
    falhas.delete(chave(tentativa.contexto));
  }

  return {
    iniciar(contexto: ContextoFalha): Tentativa {
      const tentativa = { contexto: { ...contexto }, geracao: ++geracao };
      if (contexto.idExterno === undefined || presente(contexto.idExterno)) {
        tentativas.set(chave(contexto), tentativa);
      }
      if (contexto.etapa === "descoberta") ultimaTentativaDescobertaEm = agora().toISOString();
      return tentativa;
    },
    concluir,
    falhar(tentativa: Tentativa, erro: unknown): FalhaPublica {
      const falha = criarFalhaPublica(erro, tentativa.contexto, agora().toISOString());
      if (atual(tentativa)) falhas.set(chave(tentativa.contexto), falha);
      return falha;
    },
    descobertaValida(tentativa: Tentativa, ids: string[]) {
      if (!atual(tentativa)) return;
      concluir(tentativa);
      ultimaDescobertaValidaEm = agora().toISOString();
      idsAtuais = new Set(ids);
      for (const id of verificados) if (!idsAtuais.has(id)) verificados.delete(id);
      for (const [id, entrada] of tentativas) {
        const externo = entrada.contexto.idExterno;
        if (externo !== undefined && !idsAtuais.has(externo)) {
          tentativas.delete(id);
          falhas.delete(id);
          verificados.delete(externo);
        }
      }
    },
    iniciarColeta() { ultimaTentativaColetaEm = agora().toISOString(); },
    concluirColeta(idExterno: string, completo: boolean) {
      if (!presente(idExterno)) return;
      verificados.add(idExterno);
      if (completo) ultimaColetaCompletaEm = agora().toISOString();
    },
    consultar() {
      const aguardando = ultimaDescobertaValidaEm === null || [...idsAtuais].some((id) => !verificados.has(id));
      return {
        situacao: falhas.size ? "degradado" as const : aguardando ? "aguardando" as const : "ok" as const,
        iniciadoEm,
        ultimaTentativaDescobertaEm,
        ultimaDescobertaValidaEm,
        ultimaTentativaColetaEm,
        ultimaColetaCompletaEm,
        falhasAtivas: [...falhas.values()].map((falha) => ({ ...falha })),
      };
    },
  };
}
