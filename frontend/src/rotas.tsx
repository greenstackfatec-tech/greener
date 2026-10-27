import { createBrowserRouter } from "react-router";
import { EmConstrucaoPage } from "./pages/EmConstrucaoPage.tsx";
import { InicioPage } from "./pages/InicioPage.tsx";

export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  administrativa: "/administrativa",
  dashboard: "/dashboard",
} as const;

export const router = createBrowserRouter([
  { path: ROTAS.inicio, element: <InicioPage /> },
  { path: ROTAS.login, element: <EmConstrucaoPage nome="Login" /> },
  { path: ROTAS.cadastro, element: <EmConstrucaoPage nome="Cadastro" /> },
  { path: ROTAS.administrativa, element: <EmConstrucaoPage nome="Administrativa" /> },
  { path: ROTAS.dashboard, element: <EmConstrucaoPage nome="Dashboard" /> },
]);
