import type { IncomingMessage } from "node:http";

export class ErroHttp extends Error {
  readonly status: number;
  readonly codigo: string;

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroHttp";
    this.status = status;
    this.codigo = codigo;
  }
}

export async function lerJson(request: IncomingMessage, limiteBytes = 8192): Promise<unknown> {
  const tipo = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (tipo !== "application/json") {
    request.resume();
    throw new ErroHttp(415, "unsupported_media_type", "Use Content-Type: application/json.");
  }
  if (Number(request.headers["content-length"] ?? 0) > limiteBytes) {
    request.resume();
    throw new ErroHttp(413, "payload_too_large", "Corpo da requisição excede o limite permitido.");
  }

  const partes: Buffer[] = [];
  let tamanho = 0;
  // Mantém o socket aberto para enviar 413 se o corpo exceder o limite.
  for await (const parte of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
    tamanho += buffer.length;
    if (tamanho > limiteBytes) {
      request.resume();
      throw new ErroHttp(413, "payload_too_large", "Corpo da requisição excede o limite permitido.");
    }
    partes.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8")) as unknown;
  } catch {
    throw new ErroHttp(400, "invalid_json", "Envie um corpo JSON válido.");
  }
}
