import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ComparacaoPage } from "../src/pages/ComparacaoPage.tsx";
import * as servicos from "../src/services/servicos.ts";
import * as comparacao from "../src/services/comparacao.ts";

function servico(id: number, nome: string): servicos.Servico {
  return {
    id, nome, status: "ativo", statusColeta: "sucesso", coletadoEm: null,
    cpuPercentual: null, memoriaGb: null, discoGb: null, redeGb: null, energiaKwh: null, emissaoCo2eG: null,
    cidade: null, latitude: null, longitude: null, regiao: null, pais: null,
  } as servicos.Servico;
}

const lista = ["Auth", "Billing", "Checkout", "Notifications", "Reports", "Search"].map((nome, i) => servico(i + 1, nome));

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(servicos, "listarServicos").mockResolvedValue(lista);
});

afterEach(cleanup);

async function marcar(...nomes: string[]) {
  for (const nome of nomes) fireEvent.click(await screen.findByRole("checkbox", { name: nome }));
}

test("botão fica desabilitado com menos de 2 serviços e explica o motivo", async () => {
  render(<ComparacaoPage />);
  await marcar("Auth");
  const botao = screen.getByRole("button", { name: "Comparar" });
  expect(botao).toBeDisabled();
  expect(screen.getByText("Selecione pelo menos 2 serviços para comparar.")).toBeInTheDocument();

  await marcar("Billing");
  expect(botao).toBeEnabled();
});

test("com 5 serviços marcados, os demais ficam bloqueados", async () => {
  render(<ComparacaoPage />);
  await marcar("Auth", "Billing", "Checkout", "Notifications", "Reports");
  expect(screen.getByRole("checkbox", { name: "Search" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Comparar" })).toBeEnabled();
});

test("mostra os totais lado a lado e o aviso de serviço sem dados", async () => {
  vi.spyOn(comparacao, "consultarComparacao").mockResolvedValue({
    itens: [
      { servicoId: 1, nome: "Auth", regiao: "Sudeste", pais: "Brasil", totalEnergiaKwh: 0.0042, totalEmissaoCo2eG: 0.256, mediaEnergiaKwh: 0.0007, mediaEmissaoCo2eG: 0.0427, qtdColetas: 6, semDados: false },
      { servicoId: 2, nome: "Billing", regiao: null, pais: null, totalEnergiaKwh: 0, totalEmissaoCo2eG: 0, mediaEnergiaKwh: 0, mediaEmissaoCo2eG: 0, qtdColetas: 0, semDados: true },
    ],
    avisos: ['Serviço "Billing" (ID 2) não possui dados de coleta no período informado. Retornando zeros.'],
  });
  render(<ComparacaoPage />);
  await marcar("Auth", "Billing");
  fireEvent.click(screen.getByRole("button", { name: "Comparar" }));

  expect(await screen.findByText("0,0042 kWh")).toBeInTheDocument();
  expect(screen.getByText("Sem dados no período")).toBeInTheDocument();
  expect(screen.getByText(/não possui dados de coleta/)).toBeInTheDocument();
  expect(comparacao.consultarComparacao).toHaveBeenCalledWith([1, 2], expect.any(Date), expect.any(Date));
});

test("erro da API mostra o estado de erro com tentar de novo", async () => {
  vi.spyOn(comparacao, "consultarComparacao").mockRejectedValue(new Error("Backend fora do ar"));
  render(<ComparacaoPage />);
  await marcar("Auth", "Billing");
  fireEvent.click(screen.getByRole("button", { name: "Comparar" }));

  expect(await screen.findByText("Backend fora do ar")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeEnabled());
});
