import { requisitar } from "./api.ts";

interface FalhaColeta {
  etapa: string;
  tipo: string;
  codigo: string;
  mensagem: string;
  ocorridoEm: string;
  idExterno?: string;
  servicoNome?: string;
}

export interface StatusRotina {
  executando: boolean;
  encerrando: boolean;
  monitoramento: {
    situacao: "aguardando" | "ok" | "degradado";
    ultimaDescobertaValidaEm: string | null;
    ultimaColetaCompletaEm: string | null;
    falhasAtivas: FalhaColeta[];
  };
}

export async function consultarStatusColeta(signal?: AbortSignal): Promise<StatusRotina> {
  const resposta = await requisitar<{ dados: StatusRotina }>("/collections/rotina/status", signal);
  const dados = resposta?.dados;
  const monitoramento = dados?.monitoramento;
  if (!dados || typeof dados.executando !== "boolean" || typeof dados.encerrando !== "boolean"
      || !monitoramento || !["aguardando", "ok", "degradado"].includes(monitoramento.situacao)
      || !Array.isArray(monitoramento.falhasAtivas) || !monitoramento.falhasAtivas.every(falhaValida)
      || (monitoramento.situacao === "ok" && monitoramento.falhasAtivas.length > 0)) {
    throw new Error("Diagnóstico de coleta inválido");
  }
  return dados;
}

function falhaValida(valor: unknown): valor is FalhaColeta {
  if (!valor || typeof valor !== "object") return false;
  const falha = valor as Record<string, unknown>;
  return ["etapa", "tipo", "codigo", "mensagem", "ocorridoEm"].every((campo) => typeof falha[campo] === "string")
    && (falha.idExterno === undefined || typeof falha.idExterno === "string")
    && (falha.servicoNome === undefined || typeof falha.servicoNome === "string");
}
