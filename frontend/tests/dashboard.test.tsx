import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DashboardPage } from "../src/pages/DashboardPage.tsx";
import * as servicos from "../src/services/servicos.ts";
import * as indicadores from "../src/services/indicadores.ts";
import * as collections from "../src/services/collections.ts";

beforeEach(() => {
  vi.spyOn(servicos, "listarServicos").mockResolvedValue([]);
  vi.spyOn(indicadores, "consultarIndicadores").mockResolvedValue({
    consumoTotalKwh: 0,
    emissaoTotalCo2eG: 0,
    servicosAtivos: 0,
    servicosIndisponiveis: 0,
  });
  vi.spyOn(collections, "consultarStatusColeta").mockResolvedValue({
    executando: false,
    encerrando: false,
    monitoramento: {
      situacao: "aguardando",
      ultimaDescobertaValidaEm: null,
      ultimaColetaCompletaEm: null,
      falhasAtivas: [],
    },
  });
});

afterEach(() => cleanup());

test("botão anuncia a atualização em andamento e volta ao nome inicial após a consulta", async () => {
  render(<DashboardPage />);

  const botao = screen.getByRole<HTMLButtonElement>("button", { name: "Atualizar dados" });
  await waitFor(() => expect(botao.disabled).toBe(false));
  expect(botao.getAttribute("aria-busy")).toBe("false");

  let concluirConsulta!: (dados: servicos.Servico[]) => void;
  vi.mocked(servicos.listarServicos).mockReturnValueOnce(new Promise((resolve) => {
    concluirConsulta = resolve;
  }));

  fireEvent.click(botao);

  expect(screen.getByRole("button", { name: "Atualizando dados" })).toBe(botao);
  expect(botao.textContent).toContain("Atualizando...");
  expect(botao.getAttribute("aria-busy")).toBe("true");
  expect(botao.disabled).toBe(true);

  await act(async () => { concluirConsulta([]); });

  expect(screen.getByRole("button", { name: "Atualizar dados" })).toBe(botao);
  expect(botao.getAttribute("aria-busy")).toBe("false");
  expect(botao.disabled).toBe(false);
});
