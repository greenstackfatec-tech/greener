/** Formata um número no padrão pt-BR; null ou valor inválido vira "—". */
export function numero(valor: number | null, casas = 1): string {
  return valor === null || !Number.isFinite(valor)
    ? "—"
    : valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/**
 * Tempo decorrido em texto curto ("há 4 min"). Recebe `agora` como argumento
 * (veja `useAgora`) para o componente se atualizar sem chamar Date.now() no render.
 * Devolve null quando a data é vazia ou inválida.
 */
export function haQuanto(instante: string | number | Date | null | undefined, agora: number): string | null {
  if (instante === null || instante === undefined) return null;
  const momento = new Date(instante).getTime();
  if (Number.isNaN(momento)) return null;

  const minutos = Math.max(0, Math.floor((agora - momento) / 60_000));
  if (minutos < 1) return "há menos de 1 min";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}
