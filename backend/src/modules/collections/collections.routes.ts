import type { Rota } from "../../shared/http.ts";
import { listar } from "./collections.controller.ts";

export const rotasCollections: Rota[] = [
  { metodo: "GET", caminho: "/collections", tratar: listar },
];