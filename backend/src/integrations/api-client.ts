/** Apoio compartilhado pelas duas integrações. Não inicia servidor nem acessa o banco. */
export interface OpcoesApi {
  baseUrl?: string;
  timeoutMs?: number;
  /** Permite testar as integrações sem chamar os serviços reais. */
  fetchImpl?: typeof fetch;
}

export type TipoErroApi = "http" | "timeout" | "rede" | "resposta_invalida";

export class ErroApi extends Error {
  readonly tipo: TipoErroApi;
  readonly statusHttp: number | undefined;
  readonly codigoApi: string | undefined;

  constructor(
    tipo: TipoErroApi,
    mensagem: string,
    detalhes: { statusHttp?: number; codigoApi?: string; cause?: unknown } = {},
  ) {
    super(mensagem, { cause: detalhes.cause });
    this.name = "ErroApi";
    this.tipo = tipo;
    this.statusHttp = detalhes.statusHttp;
    this.codigoApi = detalhes.codigoApi;
  }
}

/** Faz uma única requisição: repetir uma coleta pode produzir outra amostra. */
export async function consultarJson(
  basePadrao: string,
  variavelUrl: string,
  caminho: string,
  opcoes: OpcoesApi = {},
): Promise<unknown> {
  const base = new URL(opcoes.baseUrl ?? process.env[variavelUrl] ?? basePadrao);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new TypeError(`${variavelUrl} deve ser uma URL HTTP(S) sem credenciais, consulta ou fragmento.`);
  }
  const timeoutMs = opcoes.timeoutMs ?? Number(process.env.API_TIMEOUT_MS ?? 10000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) {
    throw new TypeError("API_TIMEOUT_MS/timeoutMs deve ser um inteiro positivo em milissegundos.");
  }
  const url = `${base.href.replace(/\/+$/, "")}/${caminho.replace(/^\/+/, "")}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resposta = await (opcoes.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    // O limite inclui a leitura do corpo, além da espera pelos cabeçalhos.
    const corpo = await resposta.text();
    let dados: unknown;
    let jsonValido = true;
    try {
      dados = JSON.parse(corpo);
    } catch {
      jsonValido = false;
    }

    if (!resposta.ok) {
      const erro = ehObjeto(dados) ? dados : {};
      throw new ErroApi(
        "http",
        typeof erro.message === "string" ? erro.message : `A API respondeu HTTP ${resposta.status}.`,
        {
          statusHttp: resposta.status,
          ...(typeof erro.error === "string" ? { codigoApi: erro.error } : {}),
        },
      );
    }
    if (!jsonValido) {
      throw new ErroApi("resposta_invalida", "A API retornou um corpo que não é JSON válido.");
    }
    return dados;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    if (controller.signal.aborted) {
      throw new ErroApi("timeout", `A API excedeu o limite de ${timeoutMs} ms.`, { cause: erro });
    }
    throw new ErroApi("rede", "Não foi possível concluir a conexão com a API.", { cause: erro });
  } finally {
    clearTimeout(timer);
  }
}

export function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function respostaInvalida(campo: string): never {
  throw new ErroApi("resposta_invalida", `Campo ausente ou inválido na resposta da API: ${campo}.`);
}

export function objeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!ehObjeto(valor)) return respostaInvalida(campo);
  return valor;
}

export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== "string") return respostaInvalida(campo);
  return valor;
}

export function textoOpcional(valor: unknown, campo: string): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") return respostaInvalida(campo);
  return valor;
}

export function numero(valor: unknown, campo: string, minimo = -Infinity, maximo = Infinity): number {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < minimo || valor > maximo) {
    return respostaInvalida(campo);
  }
  return valor;
}

/** O retorno number limita inteiros à faixa segura do JavaScript, sem perda de precisão. */
export function inteiro(valor: unknown, campo: string, minimo = -Infinity): number {
  const resultado = numero(valor, campo, minimo);
  if (!Number.isSafeInteger(resultado)) return respostaInvalida(campo);
  return resultado;
}

export function parametro(valor: string, nome: string): string {
  if (typeof valor !== "string" || !valor.trim() || valor === "." || valor === "..") {
    throw new TypeError(`${nome} deve ser um identificador não vazio, diferente de '.' e '..'.`);
  }
  return encodeURIComponent(valor);
}
