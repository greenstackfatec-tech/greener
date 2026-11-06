/**
 * Intervalo de atualização automática do dashboard (RF11, RNF02), em segundos.
 * Ajuste com VITE_INTERVALO_ATUALIZACAO_SEGUNDOS (frontend/.env no desenvolvimento;
 * INTERVALO_ATUALIZACAO_SEGUNDOS no .env da raiz com Docker). Mínimo de 5 s; valor
 * ausente ou inválido usa o padrão. O padrão fica abaixo do intervalo de coleta do
 * backend (60 s), para a tela mostrar cada coleta pouco depois de ela acontecer.
 */
const PADRAO_SEGUNDOS = 30;
const MINIMO_SEGUNDOS = 5;

function lerIntervalo(): number {
  const valor = Number(import.meta.env.VITE_INTERVALO_ATUALIZACAO_SEGUNDOS);
  return Number.isFinite(valor) && valor >= MINIMO_SEGUNDOS ? Math.round(valor) : PADRAO_SEGUNDOS;
}

export const INTERVALO_ATUALIZACAO_SEGUNDOS = lerIntervalo();
