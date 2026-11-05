import type { Servico } from "../../integrations/metrics-api.ts";
import type { ResultadoColeta } from "./collections.types.ts";

export const INTERVALO_PADRAO_SEGUNDOS = 60;
export const INTERVALO_MAXIMO_SEGUNDOS = Math.floor(2_147_483_647 / 1000);

export function intervaloAgendavel(segundos: number): boolean {
  return Number.isInteger(segundos) && segundos > 0 && segundos <= INTERVALO_MAXIMO_SEGUNDOS;
}

interface DependenciasRotina {
  listarServicos(): Promise<Servico[]>;
  buscarIntervaloAlternativo(): Promise<number>;
  coletarServico(
    servico: Servico,
    intervaloAlternativo: number,
    informarIntervalo: (segundos: number) => void,
  ): Promise<ResultadoColeta>;
  agora?: () => number;
  agendar?: (callback: () => void, milissegundos: number) => ReturnType<typeof setTimeout>;
  cancelar?: (timer: ReturnType<typeof setTimeout>) => void;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

interface AgendamentoServico {
  servico: Servico;
  presente: boolean;
  emExecucao: boolean;
  proximaEm: number;
  intervaloApi?: number;
}

export function criarRotinaColeta(dependencias: DependenciasRotina) {
  const agora = dependencias.agora ?? Date.now;
  const criarTimer = dependencias.agendar ?? setTimeout;
  const cancelarTimer = dependencias.cancelar ?? clearTimeout;
  const logger = dependencias.logger ?? console;
  const servicos = new Map<string, AgendamentoServico>();
  const pendentes = new Set<Promise<void>>();
  let ativo = false;
  let encerrado = false;
  let parando: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let descobrindo = false;
  let proximaDescoberta = 0;
  let intervaloAlternativo = INTERVALO_PADRAO_SEGUNDOS;
  let intervaloInformado: number | undefined;

  function agendar() {
    if (timer !== undefined) cancelarTimer(timer);
    timer = undefined;
    if (!ativo) return;
    let proxima = descobrindo ? Infinity : proximaDescoberta;
    for (const entrada of servicos.values()) {
      if (entrada.presente && !entrada.emExecucao) proxima = Math.min(proxima, entrada.proximaEm);
    }
    if (Number.isFinite(proxima)) {
      timer = criarTimer(disparar, Math.min(2_147_483_647, Math.max(0, proxima - agora())));
    }
  }

  function acompanhar(trabalho: () => Promise<void>, finalizar: () => void) {
    const promessa = Promise.resolve().then(() => ativo ? trabalho() : undefined).catch((erro: unknown) => {
      logger.error("[COLETA] Falha na rotina; haverá nova tentativa:", erro);
    }).finally(() => {
      pendentes.delete(promessa);
      finalizar();
      agendar();
    });
    pendentes.add(promessa);
  }

  function descobrirServicos() {
    descobrindo = true;
    acompanhar(async () => {
      const carregarIntervalo = async () => {
        if (intervaloInformado !== undefined) return;
        try {
          const valor = await dependencias.buscarIntervaloAlternativo();
          if (intervaloAgendavel(valor)) intervaloAlternativo = valor;
          else logger.warn(`[COLETA] Intervalo local inválido; mantendo ${intervaloAlternativo}s.`);
        } catch (erro) {
          logger.error(`[COLETA] Falha na configuração; mantendo ${intervaloAlternativo}s:`, erro);
        }
      };
      const [listagem] = await Promise.allSettled([dependencias.listarServicos(), carregarIntervalo()]);
      if (listagem.status === "rejected") throw listagem.reason;
      const lista = listagem.value;
      if (!ativo) return;
      for (const entrada of servicos.values()) entrada.presente = false;
      for (const servico of lista) {
        const entrada = servicos.get(servico.id);
        if (entrada) {
          entrada.servico = servico;
          entrada.presente = true;
        } else {
          servicos.set(servico.id, {
            servico, presente: true, emExecucao: false, proximaEm: agora(),
          });
        }
      }
      for (const [id, entrada] of servicos) {
        if (!entrada.presente && !entrada.emExecucao) servicos.delete(id);
      }
    }, () => {
      descobrindo = false;
      proximaDescoberta = agora() + intervaloAlternativo * 1000;
    });
  }

  function coletar(entrada: AgendamentoServico) {
    entrada.emExecucao = true;
    acompanhar(async () => {
      const informarIntervalo = (segundos: number) => {
        if (intervaloAgendavel(segundos)) entrada.intervaloApi = segundos;
        else logger.warn(
          `[COLETA] ${entrada.servico.id}: intervalo da API ${segundos}s não agendável; ` +
          `usando ${entrada.intervaloApi ?? intervaloAlternativo}s no timer. Amostra preservada.`,
        );
      };
      try {
        const resultado = await dependencias.coletarServico(
          entrada.servico, entrada.intervaloApi ?? intervaloAlternativo, informarIntervalo,
        );
        logger.log(`[COLETA] ${entrada.servico.id}: resultado=${resultado.resultado}, statusMetricas=${resultado.status}`);
        if (resultado.erro) logger.error(`[COLETA] ${entrada.servico.id}: ${resultado.erro}`);
      } catch (erro) {
        logger.error(`[COLETA] ${entrada.servico.id}: falha na coleta; nova tentativa programada:`, erro);
      }
      if (entrada.intervaloApi === undefined) {
        logger.warn(`[COLETA] ${entrada.servico.id}: sem intervalo válido da API; usando ${intervaloAlternativo}s.`);
      }
    }, () => {
      entrada.emExecucao = false;
      entrada.proximaEm = agora() + (entrada.intervaloApi ?? intervaloAlternativo) * 1000;
      if (!entrada.presente) servicos.delete(entrada.servico.id);
    });
  }

  function disparar() {
    timer = undefined;
    if (!ativo) return;
    if (!descobrindo && proximaDescoberta <= agora()) descobrirServicos();
    for (const entrada of servicos.values()) {
      if (entrada.presente && !entrada.emExecucao && entrada.proximaEm <= agora()) coletar(entrada);
    }
    agendar();
  }

  function parar(): Promise<void> {
    if (parando) return parando;
    ativo = false;
    if (timer !== undefined) cancelarTimer(timer);
    timer = undefined;
    parando = Promise.allSettled([...pendentes]).then(() => {
      servicos.clear();
      parando = null;
    });
    return parando;
  }

  return {
    iniciar(intervaloSegundos?: number): boolean {
      if (ativo || parando || encerrado) return false;
      if (intervaloSegundos !== undefined && !intervaloAgendavel(intervaloSegundos)) {
        throw new TypeError(`Intervalo alternativo deve ser inteiro entre 1 e ${INTERVALO_MAXIMO_SEGUNDOS}s.`);
      }
      intervaloInformado = intervaloSegundos;
      intervaloAlternativo = intervaloSegundos ?? INTERVALO_PADRAO_SEGUNDOS;
      ativo = true;
      proximaDescoberta = agora();
      disparar();
      return true;
    },
    parar,
    encerrar(): Promise<void> {
      encerrado = true;
      return parar();
    },
    status() {
      return {
        executando: ativo,
        encerrando: parando !== null,
        coletasEmAndamento: [...servicos.values()].filter((s) => s.emExecucao).length,
        intervaloAlternativoSegundos: intervaloAlternativo,
      };
    },
  };
}
