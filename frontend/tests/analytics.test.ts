import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock do módulo api.ts
const mockRequisitar = vi.fn();
vi.mock("../src/services/api.ts", () => ({ requisitar: mockRequisitar }));

import { consultarHistorico, type HistoricoParams, type PontoHistorico } from "../src/services/analytics.ts";

describe("consultarHistorico", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPonto: PontoHistorico = {
    coletadoEm: "2026-11-18T10:00:00.000Z",
    cpuPercentual: 50,
    memoriaGb: 2,
    discoGb: 10,
    redeGb: 1,
    intervaloSegundos: 300,
    statusColeta: "sucesso",
    potenciaEstimadaW: 1000,
    duracaoSegundos: 300,
    energiaKwh: 1.5,
    emissaoCo2eG: 75.0,
  };

  const mockResposta = {
    dados: [mockPonto],
    periodo: {
      inicio: "2026-11-18T00:00:00.000Z",
      fim: "2026-11-18T23:59:59.999Z",
    },
  };

  it("deve chamar a API com os parâmetros corretos", async () => {
    mockRequisitar.mockResolvedValue(mockResposta);

    const params: Omit<HistoricoParams, "servicoId"> = {
      inicio: "2026-11-18T00:00:00.000Z",
      fim: "2026-11-18T23:59:59.999Z",
      apenasSucesso: true,
      limite: 100,
      offset: 0,
      ordenacao: "DESC",
    };

    const resultado = await consultarHistorico(1, params);

    expect(resultado).toEqual(mockResposta);
    expect(mockRequisitar).toHaveBeenCalledWith(
      "/analytics/historico/1?inicio=2026-11-18T00%3A00%3A00.000Z&fim=2026-11-18T23%3A59%3A59.999Z&apenasSucesso=true&limite=100&offset=0&ordenacao=DESC",
      undefined
    );
  });

  it("deve omitir parâmetros undefined", async () => {
    mockRequisitar.mockResolvedValue(mockResposta);

    const params: Omit<HistoricoParams, "servicoId"> = {
      inicio: "2026-11-18T00:00:00.000Z",
      fim: "2026-11-18T23:59:59.999Z",
    };

    await consultarHistorico(1, params);

    expect(mockRequisitar).toHaveBeenCalledWith(
      "/analytics/historico/1?inicio=2026-11-18T00%3A00%3A00.000Z&fim=2026-11-18T23%3A59%3A59.999Z",
      undefined
    );
  });

  it("deve propagar erro da API", async () => {
    mockRequisitar.mockRejectedValue(new Error("Erro de rede"));

    await expect(consultarHistorico(1, { inicio: "2026-11-18T00:00:00.000Z", fim: "2026-11-18T23:59:59.999Z" }))
      .rejects.toThrow("Erro de rede");
  });

  it("deve passar signal de abort", async () => {
    mockRequisitar.mockResolvedValue(mockResposta);

    const controller = new AbortController();
    const params: Omit<HistoricoParams, "servicoId"> = {
      inicio: "2026-11-18T00:00:00.000Z",
      fim: "2026-11-18T23:59:59.999Z",
    };

    await consultarHistorico(1, params, controller.signal);

    expect(mockRequisitar).toHaveBeenCalledWith(
      "/analytics/historico/1?inicio=2026-11-18T00%3A00%3A00.000Z&fim=2026-11-18T23%3A59%3A59.999Z",
      controller.signal
    );
  });
});