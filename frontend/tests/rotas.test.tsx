import { act, cleanup, render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { router } from "../src/rotas.tsx";
import { removerToken } from "../src/services/token.ts";

beforeEach(() => {
  removerToken();
  // O painel de consumo das telas de autenticação não depende de um backend real.
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    consumo_total_kwh: 0,
    emissao_total_co2e_g: 0,
    servicos_ativos: 0,
    servicos_indisponiveis: 0,
  })));
});

afterEach(() => {
  cleanup();
  removerToken();
});

afterAll(() => router.dispose());

test("/cadastro renderiza CadastroPage em vez da página em construção", async () => {
  await act(async () => { await router.navigate("/cadastro"); });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Crie sua conta" })).toBeTruthy();
  expect(screen.getByLabelText("Nome completo")).toBeTruthy();
  expect(screen.getByLabelText("CPF")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Criar conta" })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/cadastro");
});

test("/administrativa sem token redireciona para /login", async () => {
  await act(async () => { await router.navigate("/administrativa"); });
  render(<RouterProvider router={router} />);

  expect(await screen.findByRole("heading", { name: "Bem-vindo de volta" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/login");
});
