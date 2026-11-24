import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RouterProvider } from "react-router";
import { router } from "../src/rotas.tsx";
import { removerToken, obterToken, salvarToken } from "../src/services/token.ts";
import { ROTAS } from "../src/caminhos.ts";

beforeEach(() => {
  removerToken();
});

afterEach(() => {
  cleanup();
  removerToken();
});

afterAll(() => router.dispose());

/** Helper para navegar e renderizar o router */
async function navegarECaminhar(pathname: string) {
  await act(async () => { await router.navigate(pathname); });
  render(<RouterProvider router={router} />);
}

test.each([
  ["/login", "sem sessão", "Bem-vindo de volta", null],
  ["/login?expired=1", "sem sessão", "Bem-vindo de volta", null],
  ["/cadastro", "sem sessão", "Crie sua conta", null],
  ["/login", "com sessão salva", "Bem-vindo de volta", "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.assinatura"],
  ["/cadastro", "com sessão salva", "Crie sua conta", "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.assinatura"],
] as const)("tela pública %s %s não consulta indicadores protegidos", async (caminho, _sessao, titulo, token) => {
  if (token) salvarToken(token, false);
  const fetchMock = vi.fn(async () => Response.json(
    { error: "unauthorized", message: "Token ausente ou inválido" },
    { status: 401 },
  ));
  vi.stubGlobal("fetch", fetchMock);

  await navegarECaminhar(caminho);
  await act(async () => { await Promise.resolve(); });

  expect(screen.getByRole("heading", { name: titulo })).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(router.state.location.pathname + router.state.location.search).toBe(caminho);
});

/** Helper para submeter o formulário de login */
async function submeterLogin(email: string, senha: string) {
  const emailInput = screen.getByLabelText("E-mail");
  const senhaInput = screen.getByLabelText("Senha");
  const botaoEntrar = screen.getByRole("button", { name: "Entrar" });

  await act(async () => {
    fireEvent.change(emailInput, { target: { value: email } });
    fireEvent.change(senhaInput, { target: { value: senha } });
    fireEvent.click(botaoEntrar);
  });
}

/** Configura mock do fetch para testes de login */
function configurarMockLogin(respostaLogin: (url: string) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (_url: string) => {
    if (_url.includes("/auth/login")) {
      return respostaLogin(_url);
    }
    return Response.json({
      consumo_total_kwh: 0,
      emissao_total_co2e_g: 0,
      servicos_ativos: 0,
      servicos_indisponiveis: 0,
    });
  }));
}

test("login com credenciais inválidas (401) mantém usuário no formulário e exibe 'E-mail ou senha inválidos'", async () => {
  // Configura mock ANTES de navegar
  configurarMockLogin(() => new Response(
    JSON.stringify({ error: "Unauthorized", message: "E-mail ou senha inválidos." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  ));

  await navegarECaminhar("/login");

  // Preenche e submete credenciais inválidas
  await submeterLogin("errado@exemplo.com", "senhaerrada");

  // Aguarda o erro aparecer
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
  });

  // Usuário permanece na página de login
  expect(router.state.location.pathname).toBe("/login");
  expect(router.state.location.search).not.toContain("expired=1");
});

test("acessar /login?expired=1 exibe aviso de sessão expirada", async () => {
  configurarMockLogin(() => Response.json({ token: "fake-token" }));

  await navegarECaminhar("/login?expired=1");

  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão expirou. Faça login novamente.");
  });
});

test("erro da tentativa atual tem prioridade sobre aviso de sessão expirada", async () => {
  // Mock que retorna erro 500 na tentativa de login
  configurarMockLogin(() => new Response(
    JSON.stringify({ error: "Internal Server Error", message: "Erro interno do servidor." }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  ));

  // Acessa com ?expired=1 E tenta fazer login que falha com 500
  await navegarECaminhar("/login?expired=1");

  // Primeiro verifica que o aviso de expiração aparece
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão expirou. Faça login novamente.");
  });

  // Agora submete login que vai falhar com 500
  await submeterLogin("usuario@exemplo.com", "senha123");

  // O erro da tentativa atual (500) deve aparecer, NÃO o aviso de sessão expirada
  await waitFor(() => {
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível entrar agora. Tente novamente em instantes.");
  });
});

test("401 em rota protegida limpa token e redirecionaria para /login?expired=1", async () => {
  // Mock para login bem-sucedido
  let loginOk = true;
  configurarMockLogin((_url) => {
    void _url;
    if (loginOk) {
      loginOk = false;
      return Response.json({ token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.assinatura" });
    }
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Token expirado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  });

  await navegarECaminhar("/login");

  // Faz login válido
  await submeterLogin("usuario@exemplo.com", "senha123");

  // Deve ter redirecionado para dashboard
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(ROTAS.dashboard);
  });

  // Agora mocka 401 para rota protegida
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({ error: "Unauthorized", message: "Token expirado" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  )));

  // Navega para rota protegida - o api.ts deve limpar o token
  // (o window.location.href causaria reload completo, não testável no jsdom)
  await act(async () => { await router.navigate("/administrativa"); });

  // Token deve ter sido removido pelo api.ts ao receber 401
  expect(obterToken()).toBeNull();
});

test("429 (muitas tentativas) bloqueia botão e mostra contador", async () => {
  configurarMockLogin(() => new Response(
    JSON.stringify({ error: "Too Many Requests", message: "Muitas tentativas" }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
  ));

  await navegarECaminhar("/login");

  await submeterLogin("usuario@exemplo.com", "senha123");

  // O aviso de 429 não tem role="alert" (é um estado de espera, não erro urgente)
  // Buscamos pelo texto no elemento .login-alerta
  await waitFor(() => {
    const alerta = screen.getByText(/Muitas tentativas de login. Tente novamente em/);
    expect(alerta).toBeTruthy();
  });

  const botao = screen.getByRole("button", { name: "Entrar" });
  expect(botao).toBeDisabled();
});
