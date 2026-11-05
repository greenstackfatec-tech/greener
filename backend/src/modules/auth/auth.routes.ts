import type { Rota } from "../../shared/http.ts";
import { login } from "./auth.controller.ts";

export const rotasAuth: Rota[] = [
  { metodo: "POST", caminho: "/auth/login", tratar: login },
];
