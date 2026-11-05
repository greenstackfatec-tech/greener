/**
 * Caminhos das telas. Ficam neste arquivo (e não em rotas.tsx) para que as telas
 * possam usá-los sem criar import circular com o roteador.
 */
export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  administrativa: "/administrativa",
  dashboard: "/dashboard",
  /** Galeria do DD07; só registrada em desenvolvimento. */
  dashboardEstados: "/dashboard/estados",
} as const;