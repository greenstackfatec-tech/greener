import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, RouterProvider, Routes } from "react-router";
import { BotaoSair } from "../src/components/BotaoSair.tsx";
import { ROTAS } from "../src/caminhos.ts";
import { router } from "../src/rotas.tsx";
import * as analytics from "../src/services/analytics.ts";
import * as collections from "../src/services/collections.ts";
import * as indicadores from "../src/services/indicadores.ts";
import * as servicos from "../src/services/servicos.ts";
import { obterToken, removerToken, salvarToken } from "../src/services/token.ts";

// JWT de teste (exp muito distante, assinatura falsa): o frontend só lê o `exp`.
const TOKEN_DE_TESTE = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.assinatura";

beforeEach(() => {
  removerToken();
  vi.spyOn(analytics, "consultarRanking").mockResolvedValue({
    dados: [],
    aplicacoes: [],
    periodo: { inicio: "2026-10-01T18:00:00.000Z", fim: "2026-10-31T18:00:00.000Z" },
    metrica: "co2e",
    agregacao: "media",
    ordenacao: "ASC",
    resumo: { classificados: 0, semDados: 0, mediaEnergiaKwh: null, mediaEmissaoCo2eG: null, menorEnergia: null, primeiroColocado: null },
  });
  vi.spyOn(servicos, "listarServicos").mockResolvedValue([]);
  vi.spyOn(indicadores, "consultarIndicadores").mockResolvedValue({
    consumoTotalKwh: 0,
    emissaoTotalCo2eG: 0,
    servicosAtivos: 0,
    servicosIndisponiveis: 0,
    ultimaColetaEm: null,
    intervaloColetaSegundos: null,
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
  removerToken();
});

afterAll(() => router.dispose());

test("BotaoSair apaga o token e navega para /login", async () => {
  salvarToken(TOKEN_DE_TESTE, false);
  render(
    <MemoryRouter initialEntries={[ROTAS.dashboard]}>
      <Routes>
        <Route path={ROTAS.dashboard} element={<BotaoSair />} />
        <Route path={ROTAS.login} element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));

  expect(await screen.findByText("Tela de login")).toBeTruthy();
  expect(obterToken()).toBeNull();
});

test.each([
  ["localStorage (\"Lembrar de mim\" marcado)", true],
  ["sessionStorage (\"Lembrar de mim\" desmarcado)", false],
])("sair no dashboard limpa o token do %s e volta ao login", async (_nome, lembrar) => {
  salvarToken(TOKEN_DE_TESTE, lembrar);
  await act(async () => { await router.navigate(ROTAS.dashboard); });
  render(<RouterProvider router={router} />);

  fireEvent.click(await screen.findByRole("button", { name: "Sair da conta" }));

  expect(await screen.findByRole("heading", { name: "Bem-vindo de volta" })).toBeTruthy();
  expect(router.state.location.pathname).toBe(ROTAS.login);
  expect(obterToken()).toBeNull();
});

test("depois de sair, abrir o dashboard leva de novo ao login", async () => {
  salvarToken(TOKEN_DE_TESTE, true);
  await act(async () => { await router.navigate(ROTAS.dashboard); });
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("button", { name: "Sair da conta" }));
  await screen.findByRole("heading", { name: "Bem-vindo de volta" });

  await act(async () => { await router.navigate(ROTAS.dashboard); });

  await waitFor(() => expect(router.state.location.pathname).toBe(ROTAS.login));
  expect(screen.queryByRole("heading", { name: "Visão geral" })).toBeNull();
});

test("sair no ranking limpa o token e volta ao login", async () => {
  salvarToken(TOKEN_DE_TESTE, true);
  await act(async () => { await router.navigate(ROTAS.ranking); });
  render(<RouterProvider router={router} />);

  fireEvent.click(await screen.findByRole("button", { name: "Sair da conta" }));

  expect(await screen.findByRole("heading", { name: "Bem-vindo de volta" })).toBeTruthy();
  expect(router.state.location.pathname).toBe(ROTAS.login);
  expect(obterToken()).toBeNull();
});
