import { localizacaoDoServico, NAO_INFORMADO } from "./localizacao.ts";
import type { Servico } from "./services/servicos.ts";

/**
 * Filtros de serviço, região e período (DW14 / RF10, RF11).
 * Valem para o dashboard e para as telas de histórico, ranking e comparação.
 */
export type AtalhoPeriodo = "1h" | "24h" | "7d" | "personalizado";

export interface FiltrosAnalise {
  /** null = todos os serviços. */
  servicoId: number | null;
  /** null = todas as regiões; "Não informado" agrupa os serviços sem região (RF12). */
  regiao: string | null;
  periodo: AtalhoPeriodo;
  /** Usados só no período personalizado, no formato do <input type="datetime-local">. */
  inicio: string;
  fim: string;
}

export interface Periodo {
  inicio: Date;
  fim: Date;
}

const HORA_MS = 60 * 60 * 1000;

export const ATALHOS_PERIODO: { valor: AtalhoPeriodo; rotulo: string; duracaoMs: number | null }[] = [
  { valor: "1h", rotulo: "Última 1 h", duracaoMs: HORA_MS },
  { valor: "24h", rotulo: "Últimas 24 h", duracaoMs: 24 * HORA_MS },
  { valor: "7d", rotulo: "Últimos 7 dias", duracaoMs: 7 * 24 * HORA_MS },
  { valor: "personalizado", rotulo: "Personalizado", duracaoMs: null },
];

export const FILTROS_PADRAO: FiltrosAnalise = { servicoId: null, regiao: null, periodo: "24h", inicio: "", fim: "" };

/** Data local no formato do <input type="datetime-local"> (AAAA-MM-DDTHH:mm). */
export function paraCampoDataHora(data: Date): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

/** Mensagem para a tela quando o período personalizado não pode ser usado; null se está ok. */
export function erroDoPeriodo(filtros: FiltrosAnalise): string | null {
  if (filtros.periodo !== "personalizado") return null;
  if (!filtros.inicio || !filtros.fim) return "Informe o início e o fim do período.";
  const inicio = new Date(filtros.inicio);
  const fim = new Date(filtros.fim);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return "Informe datas válidas.";
  if (inicio >= fim) return "O início precisa ser anterior ao fim.";
  return null;
}

/**
 * Período que as consultas devem usar. Os atalhos são relativos a `agora`,
 * então a janela acompanha a atualização automática. Período inválido devolve
 * a mensagem para a tela bloquear a consulta.
 */
export function resolverPeriodo(filtros: FiltrosAnalise, agora: number): Periodo | { erro: string } {
  const erro = erroDoPeriodo(filtros);
  if (erro) return { erro };
  const duracaoMs = ATALHOS_PERIODO.find((a) => a.valor === filtros.periodo)?.duracaoMs;
  if (duracaoMs) return { inicio: new Date(agora - duracaoMs), fim: new Date(agora) };
  return { inicio: new Date(filtros.inicio), fim: new Date(filtros.fim) };
}

/** Regiões distintas dos serviços, em ordem alfabética e com "Não informado" por último, para o seletor. */
export function regioesDisponiveis(servicos: Servico[]): string[] {
  const regioes = new Set(servicos.map((s) => localizacaoDoServico(s).regiao));
  const informadas = [...regioes].filter((r) => r !== NAO_INFORMADO).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return regioes.has(NAO_INFORMADO) ? [...informadas, NAO_INFORMADO] : informadas;
}

export function filtrarPorServicoERegiao(servicos: Servico[], filtros: FiltrosAnalise): Servico[] {
  return servicos.filter((s) =>
    (filtros.servicoId === null || s.id === filtros.servicoId) &&
    (filtros.regiao === null || localizacaoDoServico(s).regiao === filtros.regiao),
  );
}
