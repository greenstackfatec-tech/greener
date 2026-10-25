import { listarColetas as listarColetasDoRepository } from "./collections.repository.ts";
import type { Coleta } from "./collections.repository.ts";

export async function listarColetas(): Promise<Coleta[]> {
  return listarColetasDoRepository();
}