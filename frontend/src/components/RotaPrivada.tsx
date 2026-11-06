import { Navigate, Outlet } from "react-router";
import { ROTAS } from "../caminhos.ts";
import { obterToken } from "../services/token.ts";

/**
 * Bloqueia as rotas filhas para quem não está logado: sem token válido (ausente ou expirado),
 * o usuário é levado ao /login. É só a barreira da interface; quem protege os dados de verdade é
 * o backend, que responde 401 sem token (middleware `exigirAutenticacao`).
 *
 * Uso em rotas.tsx: { element: <RotaPrivada />, children: [ ...telas privadas ] }
 */
export function RotaPrivada() {
  if (!obterToken()) {
    return <Navigate to={ROTAS.login} replace />;
  }
  return <Outlet />;
}
