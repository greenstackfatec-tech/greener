import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CadastroPage } from "../src/pages/CadastroPage.tsx";
import { LoginPage } from "../src/pages/LoginPage.tsx";

afterEach(cleanup);

test.each([
  ["login", LoginPage, "Bem-vindo de volta"],
  ["cadastro", CadastroPage, "Crie sua conta"],
] as const)("%s mantém um único rodapé mínimo depois do conteúdo principal", (_tela, Pagina, titulo) => {
  render(<MemoryRouter><Pagina /></MemoryRouter>);

  const conteudo = screen.getByRole("main");
  const rodape = screen.getByRole("contentinfo");
  expect(within(conteudo).getByRole("heading", { name: titulo })).toBeInTheDocument();
  expect(rodape).toHaveClass("footer--minimo");
  expect(conteudo.nextElementSibling).toBe(rodape);
  expect(rodape.parentElement).toBe(conteudo.parentElement);
  expect(within(conteudo).queryByRole("contentinfo")).not.toBeInTheDocument();
  expect(within(rodape).getByRole("link", { name: "GreenER, página inicial" })).toHaveAttribute("href", "/");
  expect(within(rodape).getByText(/Todos os direitos reservados/)).toBeInTheDocument();
  expect(within(rodape).queryByRole("navigation")).not.toBeInTheDocument();
});

test("rodapé permanece depois do formulário ao trocar o tipo de cadastro e exibir erros", () => {
  render(<MemoryRouter><CadastroPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Pessoa jurídica" }));
  fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

  expect(screen.getByLabelText("Razão social")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("CNPJ")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("main").nextElementSibling).toBe(screen.getByRole("contentinfo"));
});
