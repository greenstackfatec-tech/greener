/**
 * Controller para endpoints de coletas (Node.js http nativo).
 * TP16 - Endpoints de serviços e indicadores (RF09).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { executarRodadaColeta, iniciarRotinaColeta, type ResultadoRodadaColeta } from "./coletas.service.ts";

/** Tamanho máximo do body em bytes (1MB). */
const MAX_BODY_SIZE = 1024 * 1024;

/** Armazena a função de parada da rotina ativa. */
let pararRotina: (() => void) | null = null;

/** Resposta JSON padronizada. */
function responder(
  response: ServerResponse<IncomingMessage>,
  status: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

/** Lê o body JSON da requisição com limite de tamanho. */
async function lerBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error("Body muito grande"));
        request.destroy();
        return;
      }
      data += chunk;
    });

    request.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });

    request.on("error", reject);
  });
}

/** Valida Content-Type para JSON. */
function validarContentType(request: IncomingMessage, response: ServerResponse<IncomingMessage>): boolean {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    responder(response, 415, {
      sucesso: false,
      mensagem: "Content-Type deve ser application/json",
    });
    return false;
  }
  return true;
}

/**
 * POST /coletas/executar
 * Executa uma rodada de coleta manual (sob demanda).
 */
export async function executarColetaManual(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    const resultado: ResultadoRodadaColeta = await executarRodadaColeta();
    responder(response, 200, {
      sucesso: true,
      mensagem: "Rodada de coleta executada com sucesso",
      dados: resultado,
    });
  } catch (erro) {
    console.error("[CONTROLLER] Erro ao executar coleta manual:", erro);
    responder(response, 500, {
      sucesso: false,
      mensagem: "Erro ao executar coleta",
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
    });
  }
}

/**
 * POST /coletas/rotina/iniciar
 * Inicia a rotina de coleta periódica.
 * Body: { intervaloSegundos?: number }
 */
export async function iniciarRotinaColetaPeriodica(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  if (!validarContentType(request, response)) return;

  try {
    if (pararRotina) {
      responder(response, 400, {
        sucesso: false,
        mensagem: "Rotina de coleta já está em execução",
      });
      return;
    }

    const body = await lerBody(request);
    const intervaloSegundos = Number(body.intervaloSegundos ?? 60);
    if (!Number.isInteger(intervaloSegundos) || intervaloSegundos < 10) {
      responder(response, 400, {
        sucesso: false,
        mensagem: "intervaloSegundos deve ser um inteiro >= 10",
      });
      return;
    }

    pararRotina = iniciarRotinaColeta(intervaloSegundos);

    responder(response, 200, {
      sucesso: true,
      mensagem: `Rotina de coleta iniciada com intervalo de ${intervaloSegundos}s`,
      dados: { intervaloSegundos },
    });
  } catch (erro) {
    console.error("[CONTROLLER] Erro ao iniciar rotina:", erro);
    responder(response, 500, {
      sucesso: false,
      mensagem: "Erro ao iniciar rotina de coleta",
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
    });
  }
}

/**
 * POST /coletas/rotina/parar
 * Para a rotina de coleta periódica.
 */
export async function pararRotinaColetaPeriodica(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    if (!pararRotina) {
      responder(response, 400, {
        sucesso: false,
        mensagem: "Nenhuma rotina de coleta em execução",
      });
      return;
    }

    pararRotina();
    pararRotina = null;

    responder(response, 200, {
      sucesso: true,
      mensagem: "Rotina de coleta parada com sucesso",
    });
  } catch (erro) {
    console.error("[CONTROLLER] Erro ao parar rotina:", erro);
    responder(response, 500, {
      sucesso: false,
      mensagem: "Erro ao parar rotina de coleta",
      erro: erro instanceof Error ? erro.message : "Erro desconhecido",
    });
  }
}

/**
 * GET /coletas/rotina/status
 * Retorna o status da rotina de coleta.
 */
export async function statusRotinaColeta(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  responder(response, 200, {
    sucesso: true,
    dados: { executando: pararRotina !== null },
  });
}

/** Mapeamento de rotas para handlers. */
export const rotasColetas: Record<string, Record<string, (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => Promise<void>>> = {
  "POST": {
    "/coletas/executar": executarColetaManual,
    "/coletas/rotina/iniciar": iniciarRotinaColetaPeriodica,
    "/coletas/rotina/parar": pararRotinaColetaPeriodica,
  },
  "GET": {
    "/coletas/rotina/status": statusRotinaColeta,
  },
};