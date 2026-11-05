import type { Rota } from "../../shared/http.ts";
import { buscar, listar } from "./services.controller.ts";

// A route só liga "método + caminho" ao controller.
export const rotasServices: Rota[] = [
  { metodo: "GET", caminho: "/services", tratar: listar },
  { metodo: "GET", caminho: "/services/:id", tratar: buscar },
];