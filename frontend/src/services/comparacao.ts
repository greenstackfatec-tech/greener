import { requisitar } from "./api.ts";

/** A rota de comparação aceita de 2 a 5 serviços distintos (RF15). */
export const MIN_SERVICOS_COMPARACAO = 2;
export const MAX_SERVICOS_COMPARACAO = 5;

/** Totais de um serviço no período, já com os nomes usados no frontend. */
export interface ItemComparacao {
  servicoId: number;
  nome: string;
  regiao: string | null;
  pais: string | null;
  totalEnergiaKwh: number;
  totalEmissaoCo2eG: number;
  mediaEnergiaKwh: number;
  mediaEmissaoCo2eG: number;
  qtdColetas: number;
  /** true quando o serviço não teve coleta no período (a API devolve zeros). */
  semDados: boolean;
}

export interface Comparacao {
  itens: ItemComparacao[];
  /** Mensagens da API, por exemplo serviço sem coleta no período. */
  avisos: string[];
}

/** Formato de cada item de `GET /analytics/comparacao` (ver docs/api.md, seção 3.9). */
interface ItemApi {
  servicoId: unknown;
  nome: unknown;
  regiao?: unknown;
  pais?: unknown;
  totalEnergiaKwh: unknown;
  totalEmissaoCo2eG: unknown;
  mediaEnergiaKwh: unknown;
  mediaEmissaoCo2eG: unknown;
  qtdColetas: unknown;
}

interface ComparacaoApi {
  dados?: ItemApi[];
  avisos?: unknown;
}

function exigirNumero(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error(`Resposta da comparação inválida: "${campo}" ausente ou não numérico.`);
  }
  return valor;
}

function textoOuNull(valor: unknown): string | null {
  return typeof valor === "string" && valor !== "" ? valor : null;
}

function converterItem(item: ItemApi): ItemComparacao {
  const qtdColetas = exigirNumero(item.qtdColetas, "qtdColetas");
  return {
    servicoId: exigirNumero(item.servicoId, "servicoId"),
    nome: typeof item.nome === "string" ? item.nome : `Serviço ${String(item.servicoId)}`,
    regiao: textoOuNull(item.regiao),
    pais: textoOuNull(item.pais),
    totalEnergiaKwh: exigirNumero(item.totalEnergiaKwh, "totalEnergiaKwh"),
    totalEmissaoCo2eG: exigirNumero(item.totalEmissaoCo2eG, "totalEmissaoCo2eG"),
    mediaEnergiaKwh: exigirNumero(item.mediaEnergiaKwh, "mediaEnergiaKwh"),
    mediaEmissaoCo2eG: exigirNumero(item.mediaEmissaoCo2eG, "mediaEmissaoCo2eG"),
    qtdColetas,
    semDados: qtdColetas === 0,
  };
}

/** GET /api/analytics/comparacao. Exige login; os serviços seguem a ordem escolhida na tela. */
export async function consultarComparacao(
  servicoIds: readonly number[],
  inicio: Date,
  fim: Date,
  signal?: AbortSignal,
): Promise<Comparacao> {
  const query = new URLSearchParams({
    servicos: servicoIds.join(","),
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
  });
  const bruto = await requisitar<ComparacaoApi>(`/analytics/comparacao?${query.toString()}`, signal);
  if (!Array.isArray(bruto.dados)) {
    throw new Error('Resposta da comparação inválida: "dados" ausente.');
  }
  return {
    itens: bruto.dados.map(converterItem),
    avisos: Array.isArray(bruto.avisos) ? bruto.avisos.filter((a): a is string => typeof a === "string") : [],
  };
}
