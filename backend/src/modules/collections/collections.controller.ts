import type { IncomingMessage, ServerResponse } from "node:http";
import { responder } from "../../shared/http.ts";
import {
  executarRodadaColeta,
  rotinaColeta,
  consultarMonitoramentoColeta,
  type ResultadoRodadaColeta,
} from "./collections.service.ts";
import { intervaloAgendavel, INTERVALO_MAXIMO_SEGUNDOS } from "./collections.scheduler.ts";
import { ErroApi } from "../../integrations/api-client.ts";

/** Tamanho máximo do body em bytes (1MB). */
const MAX_BODY_SIZE = 1024 * 1024;

/** Lê o body JSON da requisição com limite de tamanho. */
async function lerBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
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
        const body: unknown = data ? JSON.parse(data) : {};
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          reject(new SyntaxError("Body deve ser um objeto JSON"));
          return;
        }
        resolve(body as Record<string, unknown>);
      } catch {
        reject(new SyntaxError("JSON inválido"));
      }
    });

    request.on("error", reject);
  });
}

/** Valida Content-Type para JSON. */
function validarContentType(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): boolean {
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
 * POST /collections/executar
 * Executa uma rodada de coleta manual (sob demanda).
 */
export async function executarColetaManual(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    const resultado: ResultadoRodadaColeta = await executarRodadaColeta();
    const completo = resultado.totalServicos === 0 || resultado.sucessos === resultado.totalServicos;
    const indisponivel = resultado.totalServicos > 0 && resultado.indisponiveis === resultado.totalServicos;
    responder(response, 200, {
      sucesso: completo,
      resultado: completo ? "completo" : indisponivel ? "falha" : "parcial",
      mensagem: resultado.totalServicos === 0 ? "A API não retornou serviços nesta rodada."
        : completo ? "Rodada de coleta concluída com sucesso."
        : indisponivel ? "Não foi possível obter métricas dos serviços nesta rodada."
        : "Rodada concluída com resultados parciais.",
      dados: resultado,
    });
  } catch (erro) {
    console.error("[CONTROLLER] Erro ao executar coleta manual:", erro);
    const externo = erro instanceof ErroApi;
    const timeout = externo && erro.tipo === "timeout";
    const mensagem = externo
      ? timeout ? "Não foi possível atualizar a lista de serviços no tempo esperado."
        : "Não foi possível atualizar a lista de serviços. Tente novamente mais tarde."
      : "Não foi possível concluir a coleta. Verifique a configuração e a conexão com o banco.";
    responder(response, externo ? timeout ? 504 : 502 : 500, {
      sucesso: false,
      resultado: "falha",
      error: externo ? timeout ? "external_api_timeout" : "external_api_failure" : "internal_error",
      message: mensagem,
      mensagem,
      erro: mensagem,
    });
  }
}

/**
 * POST /collections/rotina/iniciar
 * Inicia a rotina de coleta periódica.
 * Body: { intervaloSegundos?: number }
 */
export async function iniciarRotinaColetaPeriodica(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  if (!validarContentType(request, response)) return;

  try {
    const body = await lerBody(request);
    const intervaloSegundos = body.intervaloSegundos;
    if (intervaloSegundos !== undefined &&
        (typeof intervaloSegundos !== "number" || !intervaloAgendavel(intervaloSegundos))) {
      responder(response, 400, {
        sucesso: false,
        mensagem: `intervaloSegundos deve ser um inteiro entre 1 e ${INTERVALO_MAXIMO_SEGUNDOS}`,
      });
      return;
    }

    if (!rotinaColeta.iniciar(intervaloSegundos)) {
      responder(response, 400, {
        sucesso: false,
        mensagem: "Rotina de coleta já iniciada ou em encerramento",
      });
      return;
    }

    const status = rotinaColeta.status();
    responder(response, 200, {
      sucesso: true,
      mensagem: "Rotina iniciada; cada serviço usa o intervalo informado pela API",
      dados: { intervaloSegundos: status.intervaloAlternativoSegundos, ...status },
    });
  } catch (erro) {
    if (erro instanceof SyntaxError) {
      responder(response, 400, { sucesso: false, mensagem: erro.message });
      return;
    }
    console.error("[CONTROLLER] Erro ao iniciar rotina:", erro);
    responder(response, 500, {
      sucesso: false,
      mensagem: "Não foi possível iniciar a rotina de coleta.",
      erro: "Não foi possível iniciar a rotina de coleta.",
      error: "internal_error",
      message: "Não foi possível iniciar a rotina de coleta.",
    });
  }
}

/**
 * POST /collections/rotina/parar
 * Para a rotina de coleta periódica.
 */
export async function pararRotinaColetaPeriodica(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    const status = rotinaColeta.status();
    if (!status.executando && !status.encerrando) {
      responder(response, 400, {
        sucesso: false,
        mensagem: "Nenhuma rotina de coleta em execução",
      });
      return;
    }

    await rotinaColeta.parar();

    responder(response, 200, {
      sucesso: true,
      mensagem: "Rotina de coleta parada com sucesso",
    });
  } catch (erro) {
    console.error("[CONTROLLER] Erro ao parar rotina:", erro);
    responder(response, 500, {
      sucesso: false,
      mensagem: "Não foi possível parar a rotina de coleta.",
      erro: "Não foi possível parar a rotina de coleta.",
      error: "internal_error",
      message: "Não foi possível parar a rotina de coleta.",
    });
  }
}

/**
 * GET /collections/rotina/status
 * Retorna o status da rotina de coleta.
 */
export async function statusRotinaColeta(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  responder(response, 200, {
    sucesso: true,
    dados: { ...rotinaColeta.status(), monitoramento: consultarMonitoramentoColeta() },
  });
}

/**
 * GET /collections
 * Lista o histórico de coletas.
 */
export async function listar(
  _request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  const { listarColetas } = await import("./collections.service.ts");
  const coletas = await listarColetas();
  responder(response, 200, coletas);
}
