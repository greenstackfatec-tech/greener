import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DashboardPage } from "../src/pages/DashboardPage.tsx";
import { INTERVALO_ATUALIZACAO_SEGUNDOS } from "../src/config.ts";
import * as servicos from "../src/services/servicos.ts";
import * as indicadores from "../src/services/indicadores.ts";
import * as collections from "../src/services/collections.ts";

beforeEach(() => {
  sessionStorage.clear();
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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

function servico(id: number, nome: string, regiao: string | null, energiaKwh: number): servicos.Servico {
  return {
    id, nome, status: "ativo", cidade: null, latitude: null, longitude: null, regiao, pais: regiao ? "Brasil" : null,
    coletadoEm: "2026-11-10T12:00:00.000Z", statusColeta: "sucesso", cpuPercentual: 10, memoriaGb: 1, discoGb: 1,
    redeGb: 1, energiaKwh, emissaoCo2eG: energiaKwh * 100,
  };
}

const nomesNaTabela = () => screen.getAllByRole("row").slice(1).map((linha) => linha.querySelector("strong")?.textContent);

test("filtra por região e mantém filtros, ordem e visão na atualização automática", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.mocked(servicos.listarServicos).mockResolvedValue([
    servico(1, "API", "Sudeste", 0.2),
    servico(2, "Fila", "Nordeste", 0.9),
    servico(3, "Banco", "Sudeste", 0.5),
  ]);
  render(<DashboardPage />);
  await screen.findByRole("option", { name: "API" });

  fireEvent.click(screen.getByRole("button", { name: "Tabela" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por região" }), { target: { value: "Sudeste" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Ordenar serviços" }), { target: { value: "energia" } });
  expect(nomesNaTabela()).toEqual(["Banco", "API"]);

  // A próxima coleta traz um serviço novo na região e muda os valores.
  vi.mocked(servicos.listarServicos).mockResolvedValue([
    servico(1, "API", "Sudeste", 0.8),
    servico(2, "Fila", "Nordeste", 0.9),
    servico(3, "Banco", "Sudeste", 0.5),
    servico(4, "Cache", "Sudeste", 0.6),
  ]);
  const chamadas = vi.mocked(servicos.listarServicos).mock.calls.length;
  await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_ATUALIZACAO_SEGUNDOS * 1000); });
  await waitFor(() => expect(nomesNaTabela()).toEqual(["API", "Cache", "Banco"]));

  expect(vi.mocked(servicos.listarServicos).mock.calls.length).toBeGreaterThan(chamadas);
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Filtrar por região" }).value).toBe("Sudeste");
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Ordenar serviços" }).value).toBe("energia");
  expect(screen.getByRole("button", { name: "Tabela" }).getAttribute("aria-pressed")).toBe("true");
});

test("filtro por serviço mostra só o serviço escolhido e limpar volta a mostrar todos", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "API", "Sudeste", 0.2), servico(2, "Fila", null, 0.9)]);
  render(<DashboardPage />);
  await screen.findByRole("option", { name: "API" });
  fireEvent.click(screen.getByRole("button", { name: "Tabela" }));

  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por serviço" }), { target: { value: "2" } });
  expect(nomesNaTabela()).toEqual(["Fila"]);

  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(nomesNaTabela()).toEqual(["API", "Fila"]);
});
