import type { Rota } from "../../shared/http.ts";
import { cadastro, login } from "./auth.controller.ts";

export const rotasAuth: Rota[] = [
  { metodo: "POST", caminho: "/auth/login", tratar: login },
  { metodo: "POST", caminho: "/auth/register", tratar: cadastro },
];
