import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { dataHora } from "../src/formatacao.ts";
import { RankingPage } from "../src/pages/RankingPage.tsx";
import type { RankingItem, RankingResposta } from "../src/services/analytics.ts";
import { removerToken, salvarToken } from "../src/services/token.ts";

const aplicacoes = [{ id: 4, nome: "Verde" }, { id: 9, nome: "Aurora" }];
const lider: RankingItem = {
  servicoId: 1, nome: "EcoCart API", aplicacao: "Verde",
  mediaEnergiaKwh: 0.002, mediaEmissaoCo2eG: 80,
  totalEnergiaKwh: 2, totalEmissaoCo2eG: 800, tendenciaPercentual: -18,
};
const segundo: RankingItem = {
  ...lider, servicoId: 21, nome: "Ponto de coleta", aplicacao: "Aurora", tendenciaPercentual: null,
};
const fetchMock = vi.fn<typeof fetch>();

function parametros(url: RequestInfo | URL) {
  return new URL(String(url), "http://localhost").searchParams;
}

function resposta(url: RequestInfo | URL, dados: RankingItem[] = [lider], classificados = 1) {
  const query = parametros(url);
  return Response.json({
    dados, aplicacoes,
    periodo: { inicio: "2026-10-01T18:00:00.000Z", fim: "2026-10-31T18:00:00.000Z" },
    metrica: query.get("metrica") === "energia" ? "energia" : "co2e",
    agregacao: query.get("agregacao") === "total" ? "total" : "media",
    ordenacao: query.get("ordenacao") === "DESC" ? "DESC" : "ASC",
    resumo: {
      classificados, semDados: 1, mediaEnergiaKwh: 0.002, mediaEmissaoCo2eG: 80,
      menorEnergia: { nome: lider.nome, mediaEnergiaKwh: 0.002 },
      primeiroColocado: classificados > 0 ? lider : null,
    },
  } satisfies RankingResposta);
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => resposta(url));
  vi.stubGlobal("fetch", fetchMock);
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
  salvarToken(`e30.${payload}.teste`, false);
});

afterEach(() => {
  cleanup();
  removerToken();
});

test("consulta os últimos 30 dias na abertura e aplica métrica, ordem e escopo somente após enviar", async () => {
  render(<RankingPage />);
  const tabela = await screen.findByRole("table", { name: "Classificação de serviços" });
  const [urlInicial, config] = fetchMock.mock.calls[0];
  expect(String(urlInicial)).toContain("/api/analytics/ranking?");
  expect(config?.headers).toBeInstanceOf(Headers);
  expect(new Headers(config?.headers).get("Authorization")).toMatch(/^Bearer /);
  const inicial = parametros(urlInicial);
  expect(inicial.get("metrica")).toBe("co2e");
  expect(inicial.get("agregacao")).toBe("media");
  expect(inicial.get("ordenacao")).toBe("ASC");
  expect(Date.parse(inicial.get("fim")!) - Date.parse(inicial.get("inicio")!)).toBe(30 * 86_400_000);
  expect(within(tabela).getByText("0,08 kg CO₂e")).toBeInTheDocument();
  expect(within(tabela).getByText("0,002 kWh")).toBeInTheDocument();
  expect(screen.getByText("Período aplicado").parentElement).toHaveTextContent(dataHora(Date.parse("2026-10-01T18:00:00.000Z")));
  expect(screen.getByText("1 serviço sem dados de CO₂e no período.")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Métrica"), { target: { value: "energiaTotal" } });
  fireEvent.change(screen.getByLabelText("Ordem"), { target: { value: "DESC" } });
  fireEvent.change(screen.getByLabelText("Escopo"), { target: { value: "9" } });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByText("Maior consumo de energia no período.");
  const aplicada = parametros(fetchMock.mock.calls[1][0]);
  expect(aplicada.get("metrica")).toBe("energia");
  expect(aplicada.get("agregacao")).toBe("total");
  expect(aplicada.get("ordenacao")).toBe("DESC");
  expect(aplicada.get("aplicacaoId")).toBe("9");
  expect(aplicada.get("offset")).toBe("0");
});

test("valida datas personalizadas e repete o mesmo intervalo se a consulta falhar", async () => {
  render(<RankingPage />);
  await screen.findByRole("table");
  fireEvent.change(screen.getByLabelText("Período"), { target: { value: "personalizado" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-10-10T10:00" } });
  fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2026-10-09T10:00" } });
  expect(screen.getByRole("alert")).toHaveTextContent("O início precisa ser anterior ao fim.");
  expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  fetchMock.mockResolvedValueOnce(Response.json({}, { status: 502 }));
  fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2026-10-11T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByRole("heading", { name: "Erro ao carregar o ranking" });
  const aplicada = fetchMock.mock.calls[1][0];
  expect(parametros(aplicada).get("inicio")).toBe(new Date("2026-10-10T10:00").toISOString());
  expect(parametros(aplicada).get("fim")).toBe(new Date("2026-10-11T10:00").toISOString());

  fireEvent.change(screen.getByLabelText("Período"), { target: { value: "7d" } });
  fetchMock.mockImplementationOnce(async (url) => resposta(url, [], 0));
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("heading", { name: "Nenhum serviço com dados no período" });
  expect(fetchMock.mock.calls[2][0]).toBe(aplicada);
  expect(screen.getByText("Período aplicado")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByText("TOP 1")).not.toBeInTheDocument();
});

test("mantém período, resumo e líder entre páginas e reinicia a paginação ao aplicar filtros", async () => {
  fetchMock.mockImplementation(async (url) => resposta(url, parametros(url).get("offset") === "20" ? [segundo] : [lider], 21));
  render(<RankingPage />);
  expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  expect(await screen.findByText("Página 2 de 2")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: lider.nome })).toBeInTheDocument();
  const tabela = screen.getByRole("table");
  expect(within(tabela).getByText("21")).toBeInTheDocument();
  expect(within(tabela).getByText(/Sem base de comparação/)).toBeInTheDocument();
  expect(parametros(fetchMock.mock.calls[1][0]).get("inicio")).toBe(parametros(fetchMock.mock.calls[0][0]).get("inicio"));
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  expect(parametros(fetchMock.mock.calls[2][0]).get("offset")).toBe("0");
});

test("volta à última página disponível se o número de serviços mudar durante a navegação", async () => {
  fetchMock
    .mockImplementationOnce(async (url) => resposta(url, [lider], 21))
    .mockImplementationOnce(async (url) => resposta(url, [], 1));
  render(<RankingPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));

  const tabela = await screen.findByRole("table");
  expect(within(tabela).getByText(lider.nome)).toBeInTheDocument();
  expect(fetchMock.mock.calls.map(([url]) => parametros(url).get("offset"))).toEqual(["0", "20", "0"]);
});

test("cancela buscas antigas e mantém apenas o resultado da última aplicação", async () => {
  let resolver: (valor: Response) => void = () => undefined;
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve; }));
  render(<RankingPage />);
  expect(screen.getByRole("heading", { name: "Carregando ranking" })).toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText("Métrica"), { target: { value: "energiaTotal" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByText("Menor consumo de energia no período.");
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await act(async () => resolver(resposta(fetchMock.mock.calls[0][0], [], 0)));
  expect(screen.getByRole("table")).toBeInTheDocument();
});
