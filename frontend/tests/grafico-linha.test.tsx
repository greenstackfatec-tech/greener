import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraficoLinha, type PontoGrafico } from "../src/components/GraficoLinha.tsx";

describe("GraficoLinha", () => {
  const pontosPadrao: PontoGrafico[] = [
    { data: "2026-11-18T10:00:00.000Z", energia: 1.0, co2e: 50.0 },
    { data: "2026-11-18T11:00:00.000Z", energia: 1.5, co2e: 75.0 },
    { data: "2026-11-18T12:00:00.000Z", energia: 2.0, co2e: 100.0 },
    { data: "2026-11-18T13:00:00.000Z", energia: 1.2, co2e: 60.0 },
    { data: "2026-11-18T14:00:00.000Z", energia: 1.8, co2e: 90.0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o gráfico com pontos válidos", () => {
    render(<GraficoLinha pontos={pontosPadrao} altura={300} />);

    expect(screen.getByRole("region", { name: /gráfico de linha/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/legenda das séries/i)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há pontos", () => {
    render(<GraficoLinha pontos={[]} vazioTexto="Sem dados" />);

    expect(screen.getByText("Sem dados")).toBeInTheDocument();
  });

  it("renderiza legenda com ambas as séries", () => {
    render(<GraficoLinha pontos={pontosPadrao} />);

    expect(screen.getByRole("button", { name: /energia \(kwh\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /co₂e \(g\)/i })).toBeInTheDocument();
  });

  it("alterna visibilidade da série ao clicar na legenda", () => {
    const aoAlternarSerie = vi.fn();
    render(<GraficoLinha pontos={pontosPadrao} aoAlternarSerie={aoAlternarSerie} />);

    const btnCo2e = screen.getByRole("button", { name: /co₂e \(g\)/i });
    fireEvent.click(btnCo2e);

    expect(aoAlternarSerie).toHaveBeenCalledWith("co2e", false);
    expect(btnCo2e).toHaveAttribute("aria-pressed", "false");
    expect(btnCo2e).toHaveClass("grafico-linha-legenda-item--oculta");
  });

  it("renderiza eixos Y duplos (esquerda para energia, direita para CO₂e)", () => {
    render(<GraficoLinha pontos={pontosPadrao} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const eixoYEsquerda = document.querySelector(".grafico-linha-eixo-y--esquerda");
    const eixoYDireita = document.querySelector(".grafico-linha-eixo-y--direita");
    expect(eixoYEsquerda).toBeInTheDocument();
    expect(eixoYDireita).toBeInTheDocument();
  });

  it("renderiza estatísticas quando mostrarEstatisticas=true (padrão)", () => {
    render(<GraficoLinha pontos={pontosPadrao} mostrarEstatisticas={true} />);

    const statsSection = screen.getByLabelText("Estatísticas do período");
    expect(statsSection).toBeInTheDocument();
    // Verifica se os labels das estatísticas estão presentes dentro da seção de estatísticas
    expect(statsSection).toHaveTextContent("Energia");
    expect(statsSection).toHaveTextContent("CO₂e");
  });

  it("não renderiza estatísticas quando mostrarEstatisticas=false", () => {
    render(<GraficoLinha pontos={pontosPadrao} mostrarEstatisticas={false} />);

    expect(screen.queryByLabelText("Estatísticas do período")).not.toBeInTheDocument();
  });

  it("lida com pontos com valores null", () => {
    const pontosComNull: PontoGrafico[] = [
      { data: "2026-11-18T10:00:00.000Z", energia: 1.0, co2e: null },
      { data: "2026-11-18T11:00:00.000Z", energia: null, co2e: 75.0 },
      { data: "2026-11-18T12:00:00.000Z", energia: 2.0, co2e: 100.0 },
    ];

    render(<GraficoLinha pontos={pontosComNull} />);

    expect(screen.getByRole("region", { name: /gráfico de linha/i })).toBeInTheDocument();
  });

  it("aplica margens customizadas", () => {
    const { container } = render(
      <GraficoLinha pontos={pontosPadrao} margens={{ topo: 30, direita: 40, fundo: 60, esquerda: 70 }} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox");
  });

  it("renderiza corretamente com uma única série visível", () => {
    const aoAlternarSerie = vi.fn();
    render(<GraficoLinha pontos={pontosPadrao} aoAlternarSerie={aoAlternarSerie} />);

    // Esconde energia
    fireEvent.click(screen.getByRole("button", { name: /energia \(kwh\)/i }));

    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});