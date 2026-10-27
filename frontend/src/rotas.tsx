import { createBrowserRouter } from "react-router";
import { InicioPage } from "./pages/InicioPage.tsx";

export const ROTAS = {
  inicio: "/",
  login: "/login",
  cadastro: "/cadastro",
  administrativa: "/administrativa",
  dashboard: "/dashboard",
} as const;

export const router = createBrowserRouter([{ path: ROTAS.inicio, element: <InicioPage /> }]);
