import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MapaPage } from "../src/pages/MapaPage.tsx";
import * as servicos from "../src/services/servicos.ts";
import { MemoryRouter } from "react-router";

function servico(id: number, nome: string, extra: Partial<servicos.Servico> = {}): servicos.Servico {
  return {
    id, nome, status: "ativo", cidade: null, latitude: null, longitude: null, regiao: null, pais: null,
    coletadoEm: "2026-11-10T12:00:00.000Z", statusColeta: "sucesso", cpuPercentual: 10, memoriaGb: 1,
    discoGb: 1, redeGb: 1, energiaKwh: 1, emissaoCo2eG: 100, ...extra,
  };
}

const saoPaulo = { cidade: "Sao Paulo", regiao: "Sudeste", pais: "Brazil", latitude: -23.5505, longitude: -46.6333 };
const ashburn = { cidade: "Ashburn", regiao: "Virginia", pais: "United States", latitude: 39.0438, longitude: -77.4874 };

beforeEach(() => {
  vi.spyOn(servicos, "listarServicos").mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

test("mostra um pino por serviço com coordenadas e avisa quantos ficaram fora do mapa", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([
    servico(1, "Billing API", saoPaulo),
    servico(2, "Checkout Worker", ashburn),
    servico(3, "Reports Worker"),
    servico(4, "Notifications", { latitude: -23.5, longitude: null }),
  ]);
  render(<MemoryRouter><MapaPage /></MemoryRouter>);

  expect(await screen.findByRole("button", { name: /Billing API/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Checkout Worker/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Reports Worker/ })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("2 serviços ficaram fora do mapa");
  expect(screen.getByRole("status")).toHaveTextContent("Visão geral");
});

test("abrir um serviço no globo mostra a latitude e a longitude que vieram da API", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Billing API", saoPaulo)]);
  render(<MapaPage />);

  fireEvent.click(await screen.findByRole("button", { name: /Billing API/ }));

  const detalhe = await screen.findByRole("article");
  expect(within(detalhe).getByRole("heading", { name: "Billing API" })).toBeInTheDocument();
  expect(within(detalhe).getByText("Latitude").nextSibling).toHaveTextContent("-23,5505");
  expect(within(detalhe).getByText("Longitude").nextSibling).toHaveTextContent("-46,6333");
  expect(within(detalhe).getByText("Sudeste")).toBeInTheDocument();
  expect(within(detalhe).getByText("Ativo")).toBeInTheDocument();
});

test("a lista de serviços é uma alternativa ao clique no globo", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Billing API", saoPaulo), servico(2, "Checkout Worker", ashburn)]);
  render(<MapaPage />);

  const lista = await screen.findByRole("combobox", { name: "Serviço" });
  fireEvent.change(lista, { target: { value: "2" } });

  expect(within(await screen.findByRole("article")).getByRole("heading", { name: "Checkout Worker" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Checkout Worker/ })).toHaveAttribute("aria-pressed", "true");
});

test("serviços no mesmo ponto compartilham um pino e dá para escolher o outro", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Billing API", saoPaulo), servico(6, "Email Dispatcher", saoPaulo)]);
  render(<MapaPage />);

  fireEvent.click(await screen.findByRole("button", { name: /2 serviços/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Email Dispatcher" }));

  expect(within(await screen.findByRole("article")).getByRole("heading", { name: "Email Dispatcher" })).toBeInTheDocument();
});

test("nenhum serviço com coordenadas: a tela segue útil e informa que todos ficaram fora", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Reports Worker")]);
  render(<MapaPage />);

  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 serviço ficou fora do mapa"));
  expect(screen.queryByRole("button", { name: /Reports Worker/ })).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Serviço" })).toBeDisabled();
});

test("todos com coordenadas: aviso de mapa completo", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Billing API", saoPaulo), servico(2, "Checkout Worker", ashburn)]);
  render(<MapaPage />);

  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Todos os 2 serviços têm latitude e longitude"));
});

test("falha na primeira carga mostra o erro e permite tentar de novo", async () => {
  vi.mocked(servicos.listarServicos).mockRejectedValueOnce(new TypeError("Failed to fetch"));
  render(<MapaPage />);

  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent("Sem conexão com o servidor.");

  vi.mocked(servicos.listarServicos).mockResolvedValue([servico(1, "Billing API", saoPaulo)]);
  fireEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));

  expect(await screen.findByRole("button", { name: /Billing API/ })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test("sem serviços cadastrados mostra o estado vazio", async () => {
  render(<MapaPage />);

  expect(await screen.findByText("Nenhum serviço cadastrado")).toBeInTheDocument();
});
