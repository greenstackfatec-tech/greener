import { createBrowserRouter } from "react-router";
import { ROTAS } from "./caminhos.ts";
import { EmConstrucaoPage } from "./pages/EmConstrucaoPage.tsx";
import { InicioPage } from "./pages/InicioPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";

export const router = createBrowserRouter([
  { path: ROTAS.inicio, element: <InicioPage /> },
  { path: ROTAS.login, element: <LoginPage /> },
  { path: ROTAS.cadastro, element: <EmConstrucaoPage nome="Cadastro" /> },
  { path: ROTAS.administrativa, element: <EmConstrucaoPage nome="Administrativa" /> },
  { path: ROTAS.dashboard, element: <EmConstrucaoPage nome="Dashboard" /> },
]);