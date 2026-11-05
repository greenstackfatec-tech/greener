import { createBrowserRouter } from "react-router";
import { ROTAS } from "./caminhos.ts";
import { EmConstrucaoPage } from "./pages/EmConstrucaoPage.tsx";
import { InicioPage } from "./pages/InicioPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { EstadosPage } from "./pages/EstadosPage.tsx";

export const router = createBrowserRouter([
  { path: ROTAS.inicio, element: <InicioPage /> },
  { path: ROTAS.login, element: <LoginPage /> },
  { path: ROTAS.cadastro, element: <EmConstrucaoPage nome="Cadastro" /> },
  { path: ROTAS.administrativa, element: <EmConstrucaoPage nome="Administrativa" /> },
  { path: ROTAS.dashboard, element: <DashboardPage /> },
  ...(import.meta.env.DEV ? [{ path: ROTAS.dashboardEstados, element: <EstadosPage /> }] : []),
]);