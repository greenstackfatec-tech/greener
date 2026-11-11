import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { FiltrosAnalise } from "../src/components/FiltrosAnalise.tsx";
import { FILTROS_PADRAO, type FiltrosAnalise as Filtros } from "../src/filtros.ts";
import { useFiltrosAnalise } from "../src/hooks/useFiltrosAnalise.ts";

beforeEach(() => sessionStorage.clear());
afterEach(() => cleanup());

function barra(filtros: Filtros, mudancas: Partial<Filtros>[] = []) {
  render(
    <FiltrosAnalise
      filtros={filtros}
      servicos={[{ id: 1, nome: "API" }, { id: 2, nome: "Fila" }]}
      regioes={["Sudeste", "Não informado"]}
      aoAlterar={(m) => mudancas.push(m)}
      aoLimpar={() => {}}
    />,
  );
  return mudancas;
}

test("oferece os atalhos de 1 h, 24 h, 7 dias e o personalizado", () => {
  barra(FILTROS_PADRAO);
  const opcoes = [...screen.getByRole<HTMLSelectElement>("combobox", { name: "Período" }).options].map((o) => o.textContent);
  expect(opcoes).toEqual(["Última 1 h", "Últimas 24 h", "Últimos 7 dias", "Personalizado"]);
});

test("ao abrir o personalizado sugere as últimas 24 h", () => {
  const mudancas = barra(FILTROS_PADRAO);
  fireEvent.change(screen.getByRole("combobox", { name: "Período" }), { target: { value: "personalizado" } });
  expect(mudancas[0]).toMatchObject({ periodo: "personalizado" });
  expect(new Date(mudancas[0].fim!).getTime() - new Date(mudancas[0].inicio!).getTime()).toBe(24 * 60 * 60 * 1000);
});

test("período com início depois do fim é marcado e avisado na tela", () => {
  barra({ ...FILTROS_PADRAO, periodo: "personalizado", inicio: "2026-11-10T10:00", fim: "2026-11-10T09:00" });
  expect(screen.getByRole("alert").textContent).toContain("O início precisa ser anterior ao fim.");
  expect(screen.getByLabelText("Início do período").getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByLabelText("Fim do período").getAttribute("aria-invalid")).toBe("true");
});

test("guarda os filtros na sessão e os recupera ao montar de novo", () => {
  const primeiro = renderHook(() => useFiltrosAnalise());
  act(() => primeiro.result.current.alterar({ servicoId: 2, regiao: "Sudeste", periodo: "7d" }));
  primeiro.unmount();

  const segundo = renderHook(() => useFiltrosAnalise());
  expect(segundo.result.current.filtros).toMatchObject({ servicoId: 2, regiao: "Sudeste", periodo: "7d" });
});
