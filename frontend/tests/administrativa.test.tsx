import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AdministrativaPage } from "../src/pages/AdministrativaPage.tsx";
import { ErroApi } from "../src/services/api.ts";
import * as configuracao from "../src/services/configuracao.ts";
import * as indicadores from "../src/services/indicadores.ts";
import * as servicos from "../src/services/servicos.ts";

/** Serviço no formato de GET /services, com os campos de coleta preenchidos. */
function servico(parcial: Partial<servicos.Servico>): servicos.Servico {
  return {
    id: 1,
    nome: "Billing API",
    status: "ativo",
    cidade: "Sao Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    regiao: "Sudeste",
    pais: "Brazil",
    coletadoEm: "2026-11-06T12:00:00.000Z",
    statusColeta: "sucesso",
    cpuPercentual: 42.5,
    memoriaGb: 2,
    discoGb: 10.25,
    redeGb: 0.5,
    energiaKwh: 0.000723,
    emissaoCo2eG: 0.0441,
    ...parcial,
  };
}

const INDICADORES_API: indicadores.Indicadores = {
  consumoTotalKwh: 0.32345678,
  emissaoTotalCo2eG: 1.25,
  servicosAtivos: 2,
  servicosIndisponiveis: 1,
};

function abrirPagina() {
  return render(
    <MemoryRouter>
      <AdministrativaPage />
    </MemoryRouter>,
  );
}

/**
 * Card de indicador (Energia estimada, Emissões estimadas...) pelo rótulo.
 * O painel "Consumo de energia" repete alguns rótulos (ex.: "Serviços ativos"), por isso só vale o texto dentro de <article>.
 */
function cardIndicador(rotulo: string): HTMLElement {
  const card = screen.getAllByText(rotulo).map((elemento) => elemento.closest("article")).find((artigo) => artigo !== null);
  if (card === undefined || card === null) throw new Error(`Card "${rotulo}" não encontrado.`);
  return card;
}

beforeEach(() => {
  vi.spyOn(indicadores, "consultarIndicadores").mockResolvedValue(INDICADORES_API);
  vi.spyOn(servicos, "listarServicos").mockResolvedValue([
    servico({ id: 1, nome: "Billing API" }),
    servico({ id: 2, nome: "Checkout Worker", regiao: "Virginia", pais: "United States", energiaKwh: 0.000512, emissaoCo2eG: 0.1935 }),
  ]);
  // O card do intervalo de coleta tem os próprios testes; aqui só não pode chamar a rede.
  vi.spyOn(configuracao, "buscarIntervaloColeta").mockResolvedValue(60);
});

afterEach(() => cleanup());

test("mostra os indicadores consolidados vindos da API, sem dados de demonstração", async () => {
  abrirPagina();

  await waitFor(() => expect(within(cardIndicador("Energia estimada")).getByText("0,3235 kWh")).toBeTruthy());
  expect(within(cardIndicador("Emissões estimadas")).getByText("1,25 g CO₂e")).toBeTruthy();
  expect(within(cardIndicador("Serviços ativos")).getByText("2 serviços")).toBeTruthy();
  expect(within(cardIndicador("Serviços ativos")).getByText("Indisponíveis na última coleta: 1")).toBeTruthy();

  expect(indicadores.consultarIndicadores).toHaveBeenCalledTimes(1);
  // Nada do protótipo antigo pode voltar.
  expect(screen.queryByText("Dados de demonstração")).toBeNull();
  expect(screen.queryByText("API principal")).toBeNull();
  expect(screen.queryByText(/protótipo usa dados simulados/)).toBeNull();
});

test("lista os serviços reais com energia e emissão da última coleta", async () => {
  abrirPagina();

  const billing = (await screen.findByText("Billing API")).closest("li");
  const checkout = (await screen.findByText("Checkout Worker")).closest("li");
  expect(billing).not.toBeNull();
  expect(checkout).not.toBeNull();
  expect(within(billing as HTMLElement).getByText("0,0007 kWh")).toBeTruthy();
  expect(within(billing as HTMLElement).getByText("0,044 g CO₂e")).toBeTruthy();
  expect(within(billing as HTMLElement).getByText("Ativo · Sudeste, Brazil")).toBeTruthy();
  expect(within(checkout as HTMLElement).getByText("Ativo · Virginia, United States")).toBeTruthy();
  expect(screen.getByText("2 serviços · última coleta de cada um")).toBeTruthy();
});

test("serviço sem coleta mostra traço, e serviço removido não aparece", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([
    servico({
      id: 4,
      nome: "Inventory Sync",
      regiao: null,
      pais: null,
      statusColeta: null,
      coletadoEm: null,
      energiaKwh: null,
      emissaoCo2eG: null,
    }),
    servico({ id: 9, nome: "Serviço Antigo", status: "removido" }),
  ]);
  abrirPagina();

  const item = (await screen.findByText("Inventory Sync")).closest("li") as HTMLElement;
  expect(within(item).getAllByText("—")).toHaveLength(2);
  expect(within(item).getByText("Sem métricas · Localização não informada")).toBeTruthy();
  expect(screen.queryByText("Serviço Antigo")).toBeNull();
  expect(screen.getByText("1 serviço · última coleta de cada um")).toBeTruthy();
});

test("sem serviços, avisa que não há nada monitorado", async () => {
  vi.mocked(servicos.listarServicos).mockResolvedValue([]);
  abrirPagina();

  expect(await screen.findByText("Nenhum serviço monitorado no momento.")).toBeTruthy();
});

test("banco sem coletas calculadas mostra zero e explica, em vez de inventar valor", async () => {
  vi.mocked(indicadores.consultarIndicadores).mockResolvedValue({
    consumoTotalKwh: 0,
    emissaoTotalCo2eG: 0,
    servicosAtivos: 0,
    servicosIndisponiveis: 0,
  });
  abrirPagina();

  await waitFor(() => expect(within(cardIndicador("Energia estimada")).getByText("0 kWh")).toBeTruthy());
  expect(within(cardIndicador("Energia estimada")).getByText("Ainda sem coletas calculadas")).toBeTruthy();
  expect(within(cardIndicador("Serviços ativos")).getByText("0 serviços")).toBeTruthy();
});

test("enquanto carrega, os cards mostram traço e aviso de carregamento", () => {
  vi.mocked(indicadores.consultarIndicadores).mockReturnValue(new Promise(() => {}));
  vi.mocked(servicos.listarServicos).mockReturnValue(new Promise(() => {}));
  abrirPagina();

  expect(within(cardIndicador("Energia estimada")).getByText("—")).toBeTruthy();
  expect(within(cardIndicador("Energia estimada")).getByText("Carregando...")).toBeTruthy();
  expect(screen.getByText("Carregando serviços...")).toBeTruthy();
});

test("falha ao carregar os indicadores mostra erro e permite tentar de novo", async () => {
  vi.mocked(indicadores.consultarIndicadores).mockRejectedValueOnce(new ErroApi(500, "HTTP 500", "internal_error", null));
  abrirPagina();

  expect(await screen.findByText("Não foi possível carregar os indicadores.")).toBeTruthy();
  expect(within(cardIndicador("Energia estimada")).getByText("Indisponível no momento")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

  await waitFor(() => expect(within(cardIndicador("Energia estimada")).getByText("0,3235 kWh")).toBeTruthy());
  expect(indicadores.consultarIndicadores).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Não foi possível carregar os indicadores.")).toBeNull();
});

test("falha ao carregar os serviços não derruba a tela nem os indicadores", async () => {
  vi.mocked(servicos.listarServicos).mockRejectedValue(new TypeError("Failed to fetch"));
  abrirPagina();

  expect(await screen.findByText(/Não foi possível carregar os serviços\. Sem conexão com o servidor\./)).toBeTruthy();
  expect(within(cardIndicador("Energia estimada")).getByText("0,3235 kWh")).toBeTruthy();
  expect(screen.queryByText("Billing API")).toBeNull();
});

test("o card \"Por recurso\" avisa que o dado ainda não existe, sem barras inventadas", async () => {
  abrirPagina();

  expect(await screen.findByText(/Ainda não disponível: a divisão do consumo/)).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("62%")).toBeNull();
});
