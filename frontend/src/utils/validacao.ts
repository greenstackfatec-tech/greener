/**
 * Regras de validação dos formulários. Funções puras: recebem o texto digitado e devolvem
 * a mensagem de erro (para mostrar junto ao campo) ou `null` quando o valor é válido.
 *
 * Os limites (100 / 150 caracteres, 72 bytes de senha) espelham o banco (database/schema.sql)
 * e o backend (auth.service.ts). Se um mudar, o outro precisa mudar junto.
 */

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITE_NOME = 100;
export const LIMITE_EMAIL = 150;
export const TAMANHO_MINIMO_SENHA = 8;
/** O bcrypt só considera os primeiros 72 bytes; o backend recusa senhas maiores. */
export const LIMITE_BYTES_SENHA = 72;

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function calcularDigito(digitos: number[], pesos: number[]): number {
  const soma = digitos.reduce((total, digito, indice) => total + digito * (pesos[indice] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function todosIguais(valor: string): boolean {
  return /^(\d)\1+$/.test(valor);
}

/** Confere tamanho, sequência repetida (111.111.111-11) e os dois dígitos verificadores. */
export function cpfEhValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || todosIguais(cpf)) return false;
  const digitos = [...cpf].map(Number);
  const primeiro = calcularDigito(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(digitos.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === digitos[9] && segundo === digitos[10];
}

/** Confere tamanho, sequência repetida e os dois dígitos verificadores do CNPJ numérico. */
export function cnpjEhValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || todosIguais(cnpj)) return false;
  const digitos = [...cnpj].map(Number);
  const primeiro = calcularDigito(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(digitos.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === digitos[12] && segundo === digitos[13];
}

export function validarNomeCompleto(valor: string): string | null {
  const nome = valor.trim();
  if (nome === "") return "Informe seu nome completo.";
  if (nome.split(/\s+/).length < 2) return "Informe nome e sobrenome.";
  if (nome.length > LIMITE_NOME) return `Use no máximo ${LIMITE_NOME} caracteres.`;
  return null;
}

export function validarRazaoSocial(valor: string): string | null {
  const razao = valor.trim();
  if (razao === "") return "Informe a razão social.";
  if (razao.length > LIMITE_NOME) return `Use no máximo ${LIMITE_NOME} caracteres.`;
  return null;
}

export function validarCpf(valor: string): string | null {
  if (valor === "") return "Informe seu CPF.";
  if (valor.length !== 11) return "O CPF deve ter 11 números.";
  return cpfEhValido(valor) ? null : "CPF inválido.";
}

export function validarCnpj(valor: string): string | null {
  if (valor === "") return "Informe seu CNPJ.";
  if (valor.length !== 14) return "O CNPJ deve ter 14 números.";
  return cnpjEhValido(valor) ? null : "CNPJ inválido.";
}

export function validarEmail(valor: string, mensagemVazio = "Informe seu e-mail."): string | null {
  const email = valor.trim();
  if (email === "") return mensagemVazio;
  if (email.length > LIMITE_EMAIL) return `Use no máximo ${LIMITE_EMAIL} caracteres.`;
  return REGEX_EMAIL.test(email) ? null : "Informe um e-mail válido.";
}

export function validarNovaSenha(valor: string): string | null {
  // Não aplicar trim: espaços podem fazer parte da senha (o backend também não remove).
  if (valor === "") return "Crie uma senha.";
  if (valor.length < TAMANHO_MINIMO_SENHA) return `Use ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  if (new TextEncoder().encode(valor).length > LIMITE_BYTES_SENHA) {
    return "A senha é muito longa. Use no máximo 72 caracteres.";
  }
  return null;
}