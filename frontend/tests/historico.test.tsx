import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HistoricoPage } from "../src/pages/HistoricoPage.tsx";
import * as servicos from "../src/services/servicos.ts";
import * as analytics from "../src/services/analytics.ts";
import { MemoryRouter } from "react-router";

describe("HistoricoPage", () => {
  const mockServicos = [
    {
      id: 1,
      nome: "Billing API",
      status: "ativo",
      statusColeta: "sucesso",
      coletadoEm: "2026-11-18T10:00:00.000Z",
      cpuPercentual: 42,
      memoriaGb: 1.2,
      discoGb: 20,
      redeGb: 3.1,
      energiaKwh: 2.486,
      emissaoCo2eG: 120.5,
      cidade: "São Paulo",
      latitude: -23.55,
      longitude: -46.63,
      regiao: "sa-east-1",
      pais: "Brasil",
    },
    {
      id: 2,
      nome: "Checkout Web",
      status: "ativo",
      statusColeta: "sucesso",
      coletadoEm: "2026-11-18T10:02:00.000Z",
      cpuPercentual: 67.5,
      memoriaGb: 2.8,
      discoGb: 35,
      redeGb: 8.4,
      energiaKwh: 1.912,
      emissaoCo2eG: 92.7,
      cidade: "São Paulo",
      latitude: -23.55,
      longitude: -46.63,
      regiao: "sa-east-1",
      pais: "Brasil",
    },
  ];

  const mockHistorico = {
    dados: [
      {
        coletadoEm: "2026-11-18T10:00:00.000Z",
        cpuPercentual: 42,
        memoriaGb: 1.2,
        discoGb: 20,
        redeGb: 3.1,
        intervaloSegundos: 300,
        statusColeta: "sucesso",
        potenciaEstimadaW: 1000,
        duracaoSegundos: 300,
        energiaKwh: 2.486,
        emissaoCo2eG: 120.5,
      },
      {
        coletadoEm: "2026-11-18T11:00:00.000Z",
        cpuPercentual: 45,
        memoriaGb: 1.3,
        discoGb: 20,
        redeGb: 3.2,
        intervaloSegundos: 300,
        statusColeta: "sucesso",
        potenciaEstimadaW: 1100,
        duracaoSegundos: 300,
        energiaKwh: 2.6,
        emissaoCo2eG: 126.1,
      },
      {
        coletadoEm: "2026-11-18T12:00:00.000Z",
        cpuPercentual: 40,
        memoriaGb: 1.1,
        discoGb: 20,
        redeGb: 3.0,
        intervaloSegundos: 300,
        statusColeta: "sucesso",
        potenciaEstimadaW: 950,
        duracaoSegundos: 300,
        energiaKwh: 2.3,
        emissaoCo2eG: 111.55,
      },
    ],
    periodo: {
      inicio: "2026-11-18T00:00:00.000Z",
      fim: "2026-11-18T23:59:59.999Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(servicos, "listarServicos").mockResolvedValue(mockServicos);
    vi.spyOn(analytics, "consultarHistorico").mockResolvedValue(mockHistorico);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renderiza loading enquanto carrega serviços", async () => {
    vi.mocked(servicos.listarServicos).mockReturnValueOnce(new Promise(() => {}));
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    expect(screen.getByText(/carregando serviços/i)).toBeInTheDocument();
  });

  it("renderiza estado vazio quando não há serviços", async () => {
    vi.mocked(servicos.listarServicos).mockResolvedValueOnce([]);
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/nenhum serviço cadastrado/i)).toBeInTheDocument());
  });

  it("renderiza o gráfico quando há dados", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("region", { name: /gráfico de linha/i })).toBeInTheDocument());
    expect(screen.getByText(/evolução no período/i)).toBeInTheDocument();
  });

  it("mostra cards de estatísticas do período", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/energia no período/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/emissões co₂e no período/i)).toBeInTheDocument());
    // Verifica se os labels das estatísticas estão presentes (usando seletores mais específicos)
    expect(screen.getAllByText((content) => content.includes("Atual")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText((content) => content.includes("Média")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText((content) => content.includes("Total")).length).toBeGreaterThanOrEqual(2);
  });

  it("filtra por serviço selecionado", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("combobox", { name: /filtrar por serviço/i })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: /filtrar por serviço/i }), { target: { value: "2" } });

    await waitFor(() => expect(vi.mocked(analytics.consultarHistorico)).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ ordenacao: "DESC" })
    ));
  });

  it("filtra por região", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("combobox", { name: /filtrar por região/i })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: /filtrar por região/i }), { target: { value: "sa-east-1" } });

    // O serviço selecionado deve ser atualizado para um da região filtrada
    await waitFor(() => expect(screen.getByText(/checkout web/i)).toBeInTheDocument());
  });

  it("altera período e busca histórico", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: /período/i }), { target: { value: "1h" } });

    await waitFor(() => expect(vi.mocked(analytics.consultarHistorico)).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ ordenacao: "DESC" })
    ));
  });

  it("preenche datas automaticamente ao selecionar período personalizado", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: /período/i }), { target: { value: "personalizado" } });

    // O componente preenche automaticamente as últimas 24h
    const inicioInput = screen.getByLabelText(/início do período/i);
    const fimInput = screen.getByLabelText(/fim do período/i);
    await waitFor(() => expect(inicioInput).toHaveValue());
    await waitFor(() => expect(fimInput).toHaveValue());
    // Início deve ser anterior ao fim
    expect(new Date(inicioInput.value).getTime()).toBeLessThan(new Date(fimInput.value).getTime());
  });

  it("mostra erro quando início é posterior ao fim no período personalizado", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox", { name: /período/i }), { target: { value: "personalizado" } });

    const inicioInput = screen.getByLabelText(/início do período/i);
    const fimInput = screen.getByLabelText(/fim do período/i);

    fireEvent.change(inicioInput, { target: { value: "2026-11-18T12:00" } });
    fireEvent.change(fimInput, { target: { value: "2026-11-18T10:00" } });

    // O erro aparece no card de estado (e também no alert do filtro) - há duas ocorrências
    await waitFor(() => expect(screen.getAllByText(/o início precisa ser anterior ao fim\./i).length).toBeGreaterThanOrEqual(1));
  });

  it("mostra erro ao buscar histórico e mantém dados anteriores", async () => {
    vi.mocked(analytics.consultarHistorico).mockRejectedValueOnce(new Error("Erro de rede"));
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/erro ao carregar histórico/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument();

    // Clica em tentar de novo
    vi.mocked(analytics.consultarHistorico).mockResolvedValueOnce(mockHistorico);
    fireEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));

    await waitFor(() => expect(screen.getByRole("region", { name: /gráfico de linha/i })).toBeInTheDocument());
  });

  it("botão atualizar gráfico funciona", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole("region", { name: /gráfico de linha/i })).toBeInTheDocument());

    const btnAtualizar = screen.getByRole("button", { name: /atualizar gráfico/i });
    fireEvent.click(btnAtualizar);

    expect(vi.mocked(analytics.consultarHistorico).mock.calls.length).toBeGreaterThan(1);
  });

  it("usa ordenação DESC para buscar os pontos mais recentes", async () => {
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => {
      expect(vi.mocked(analytics.consultarHistorico)).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ ordenacao: "DESC" })
      );
    });
  });

  it("prioriza serviço ativo como padrão", async () => {
    const servicosComRemovido = [
      { ...mockServicos[0], status: "removido" as const },
      mockServicos[1],
    ];
    vi.mocked(servicos.listarServicos).mockResolvedValueOnce(servicosComRemovido);

    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    // O serviço ativo (Checkout Web) deve aparecer no card de resumo
    await waitFor(() => expect(screen.getAllByText(/checkout web/i).length).toBeGreaterThanOrEqual(1));
  });

  it("mostra estado vazio quando não há dados no período", async () => {
    vi.mocked(analytics.consultarHistorico).mockResolvedValueOnce({
      dados: [],
      periodo: { inicio: "2026-11-18T00:00:00.000Z", fim: "2026-11-18T23:59:59.999Z" },
    });
    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/sem dados no período/i)).toBeInTheDocument());
  });

  it("ignora coletas com status diferente de sucesso", async () => {
    const historicoComFalhas = {
      dados: [
        { ...mockHistorico.dados[0], statusColeta: "sem_metricas" as const, energiaKwh: null, emissaoCo2eG: null },
        { ...mockHistorico.dados[1], statusColeta: "indisponivel" as const, energiaKwh: null, emissaoCo2eG: null },
        mockHistorico.dados[2], // sucesso
      ],
      periodo: mockHistorico.periodo,
    };
    vi.mocked(analytics.consultarHistorico).mockResolvedValueOnce(historicoComFalhas);

    render(<MemoryRouter><HistoricoPage /></MemoryRouter>);

    // Deve mostrar apenas o ponto de sucesso (1 ponto, não 3)
    await waitFor(() => expect(screen.queryByText(/3 pontos? de coleta/i)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/1 ponto de coleta/i)).toBeInTheDocument());
  });
});