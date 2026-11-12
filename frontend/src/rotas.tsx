import { createBrowserRouter } from "react-router";
import { ROTAS } from "./caminhos.ts";
import { CadastroPage } from "./pages/CadastroPage.tsx";
import { InicioPage } from "./pages/InicioPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { AdministrativaPage } from "./pages/AdministrativaPage.tsx";
import { RotaPrivada } from "./components/RotaPrivada.tsx";
import { EstadosPage } from "./pages/EstadosPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";  // ← import

export const router = createBrowserRouter([
  { path: ROTAS.inicio, element: <InicioPage /> },
  { path: ROTAS.login, element: <LoginPage /> },
  { path: ROTAS.cadastro, element: <CadastroPage /> },
  // Rotas privadas: sem token, <RotaPrivada /> leva ao /login.
  { element: <RotaPrivada />, children: [
    { path: ROTAS.administrativa, element: <AdministrativaPage /> },
    { path: ROTAS.dashboard, element: <DashboardPage /> },
    ...(import.meta.env.DEV ? [{ path: ROTAS.dashboardEstados, element: <EstadosPage /> }] : []),
  ] },
  // ← CATCH-ALL 404 DEVE SER A ÚLTIMA ROTA
  { path: ROTAS.notFound, element: <NotFoundPage /> },
]);
