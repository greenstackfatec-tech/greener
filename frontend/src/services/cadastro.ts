import { enviar } from "./api.ts";

export type TipoPessoa = "fisica" | "juridica";

export interface DadosCadastro {
  tipoPessoa: TipoPessoa;
  /** Nome completo (pessoa física) ou razão social (pessoa jurídica). */
  nome: string;
  /** CPF ou CNPJ, só dígitos. */
  documento: string;
  email: string;
  senha: string;
}

/**
 * Códigos de erro que o backend deve devolver no HTTP 409 (conflito).
 * TODO(backend): confirmar esses nomes quando o endpoint de cadastro for criado.
 */
export const CODIGO_EMAIL_DUPLICADO = "email_already_exists";
export const CODIGO_DOCUMENTO_DUPLICADO = "document_already_exists";

/**
 * Cria a conta (POST /auth/register).
 *
 * TODO(backend): o endpoint ainda NÃO existe (hoje só há POST /auth/login) e a tabela `usuarios`
 * não tem colunas para tipo de pessoa e CPF/CNPJ. Enquanto isso, o backend responde 404 e a tela
 * mostra "cadastro indisponível". Contrato esperado:
 *   corpo:      { tipoPessoa: "fisica" | "juridica", nome, documento, email, senha }
 *   sucesso:    201 com corpo JSON (ex.: { "id": "2" }); o cliente HTTP exige JSON na resposta
 *   400:        { error: "invalid_request", message: "..." }
 *   409:        { error: "email_already_exists" | "document_already_exists", message: "..." }
 * Lança `ErroApi` (services/api.ts) quando o backend recusa.
 */
export async function cadastrar(dados: DadosCadastro): Promise<void> {
  await enviar<unknown>("/auth/register", dados);
}