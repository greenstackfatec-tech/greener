import type { Plugin, Connect } from "vite";

/**
 * Mock para desenvolvimento: responde GET /api/services, GET /api/dashboard/indicadores,
 * GET /api/analytics/historico/:servicoId, POST /api/auth/login e GET /api/__mock
 * sem backend nem banco. Ligado por `npm run dev:mock`.
 */

type CenarioMock = "ok" | "vazio" | "erro" | "lento" | "rede";

let cenarioAtual: CenarioMock = "ok";

function servicos() {
  const minutosAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
  const base = { cidade: "São Paulo", latitude: -23.55, longitude: -46.63, regiao: "sa-east-1", pais: "Brasil" };
  const vazio = { cpuPercentual: null, memoriaGb: null, discoGb: null, redeGb: null, energiaKwh: null, emissaoCo2eG: null };
  return [
    { id: 1, nome: "Billing API", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(4), cpuPercentual: 42, memoriaGb: 1.2, discoGb: 20, redeGb: 3.1, energiaKwh: 2.486, emissaoCo2eG: 120.5, ...base },
    { id: 2, nome: "Checkout Web", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(2), cpuPercentual: 67.5, memoriaGb: 2.8, discoGb: 35, redeGb: 8.4, energiaKwh: 1.912, emissaoCo2eG: 92.7, ...base },
    { id: 3, nome: "Auth Service", status: "indisponivel", statusColeta: "indisponivel", coletadoEm: minutosAtras(30), ...vazio, ...base },
    { id: 4, nome: "Reports Worker", status: "ativo", statusColeta: "sem_metricas", coletadoEm: null, ...vazio, ...base, cidade: null, latitude: null, longitude: null },
    { id: 5, nome: "Notifications", status: "ativo", statusColeta: null, coletadoEm: null, ...vazio, ...base, cidade: null, latitude: null, longitude: null, regiao: null, pais: null },
    { id: 6, nome: "Legacy Cron", status: "removido", statusColeta: null, coletadoEm: null, ...vazio, ...base },
  ];
}

function servicosVazio() {
  return [];
}

function indicadores(zerados: boolean) {
  const lista = zerados ? [] : servicos();
  const comColeta = lista.filter((s) => s.statusColeta === "sucesso");
  const soma = (campo: "energiaKwh" | "emissaoCo2eG") => comColeta.reduce((total, s) => total + (s[campo] ?? 0), 0);
  return {
    consumo_total_kwh: Number(soma("energiaKwh").toFixed(8)),
    emissao_total_co2e_g: Number(soma("emissaoCo2eG").toFixed(8)),
    servicos_ativos: lista.filter((s) => s.status === "ativo").length,
    servicos_indisponiveis: lista.filter((s) => s.status === "indisponivel").length,
    ultima_coleta_em: lista.map((s) => s.coletadoEm).filter((c) => c !== null).sort().at(-1) ?? null,
    intervalo_coleta_segundos: 60,
  };
}

function historicoMock(servicoId: number, inicioStr: string, fimStr: string) {
  const inicio = new Date(inicioStr).getTime();
  const fim = new Date(fimStr).getTime();
  const agora = Date.now();

  const fimReal = Math.min(fim, agora);
  const maxDuracao = 24 * 60 * 60 * 1000;
  const inicioReal = Math.max(inicio, fimReal - maxDuracao);

  const pontos: Array<{
    coletadoEm: string;
    cpuPercentual: number | null;
    memoriaGb: number | null;
    discoGb: number | null;
    redeGb: number | null;
    intervaloSegundos: number | null;
    statusColeta: "sucesso" | "sem_metricas" | "indisponivel";
    potenciaEstimadaW: number | null;
    duracaoSegundos: number | null;
    energiaKwh: number | null;
    emissaoCo2eG: number | null;
  }> = [];

  const intervalo = 5 * 60 * 1000;
  for (let t = fimReal - intervalo; t >= inicioReal; t -= intervalo) {
    const baseEnergia = servicoId === 1 ? 2.5 : servicoId === 2 ? 1.9 : 1.2;
    const variacao = (Math.random() - 0.5) * 0.8;
    const energia = Math.max(0.1, baseEnergia + variacao);
    const co2e = energia * 48.5;

    pontos.push({
      coletadoEm: new Date(t).toISOString(),
      cpuPercentual: 30 + Math.random() * 40,
      memoriaGb: 1 + Math.random() * 3,
      discoGb: 10 + Math.random() * 30,
      redeGb: 1 + Math.random() * 10,
      intervaloSegundos: 300,
      statusColeta: "sucesso",
      potenciaEstimadaW: energia * 1000 / 0.3,
      duracaoSegundos: 300,
      energiaKwh: Number(energia.toFixed(6)),
      emissaoCo2eG: Number(co2e.toFixed(3)),
    });
  }

  pontos.sort((a, b) => new Date(a.coletadoEm).getTime() - new Date(b.coletadoEm).getTime());

  return {
    dados: pontos,
    periodo: {
      inicio: new Date(inicioReal).toISOString(),
      fim: new Date(fimReal).toISOString(),
    },
  };
}

export function mockServicos(): Plugin {
  return {
    name: "greener-mock-servicos",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req: Connect.IncomingMessage & { url?: string; socket?: { destroy(): void } }, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const responder = (status: number, corpo: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(corpo));
        };

        // Endpoint para trocar cenário: GET /api/__mock?cenario=ok|vazio|erro|lento|rede
        if (url.pathname === "/api/__mock") {
          const cenario = url.searchParams.get("cenario") as CenarioMock | null;
          if (cenario && ["ok", "vazio", "erro", "lento", "rede"].includes(cenario)) {
            cenarioAtual = cenario;
            responder(200, { ok: true, cenario: cenarioAtual });
            return;
          }
          responder(200, { cenario: cenarioAtual });
          return;
        }

        // Aplica cenário atual às rotas principais
        const aplicarCenario = (): boolean => {
          switch (cenarioAtual) {
            case "vazio":
              return true; // Deixa passar para handlers que retornam vazio
            case "erro":
              responder(502, { codigo: "MOCK_ERRO", mensagem: "Erro simulado do mock" });
              return true;
            case "lento":
              // Atraso de 3s antes de continuar
              setTimeout(() => {}, 3000);
              return false; // Continua para handlers normais
            case "rede":
              // Simula falha de rede fechando a conexão
              req.socket?.destroy();
              return true;
            case "ok":
            default:
              return false; // Comportamento normal
          }
        };

        // Comparação (DW13): usa a última coleta de cada serviço como se fossem 6 coletas no período.
        if (url.pathname === "/api/analytics/comparacao") {
          // No cenário "vazio", todos os serviços chegam sem coleta no período.
          const semColetas = cenarioAtual === "vazio";
          if (!semColetas && aplicarCenario()) return;
          const ids = (url.searchParams.get("servicos") ?? "").split(",").map(Number);
          const lista = servicos();
          const dados = ids.map((id) => {
            const s = lista.find((item) => item.id === id);
            const energia = semColetas ? 0 : s?.energiaKwh ?? 0;
            const co2e = semColetas ? 0 : s?.emissaoCo2eG ?? 0;
            const qtdColetas = energia > 0 ? 6 : 0;
            return {
              servicoId: id, nome: s?.nome ?? `Serviço ${id}`, regiao: s?.regiao ?? null, pais: s?.pais ?? null,
              totalEnergiaKwh: energia * qtdColetas, totalEmissaoCo2eG: co2e * qtdColetas, qtdColetas,
              mediaEnergiaKwh: energia, mediaEmissaoCo2eG: co2e,
            };
          });
          const avisos = dados.filter((d) => d.qtdColetas === 0)
            .map((d) => `Serviço "${d.nome}" (ID ${d.servicoId}) não possui dados de coleta no período informado. Retornando zeros.`);
          responder(200, { dados, periodo: { inicio: url.searchParams.get("inicio"), fim: url.searchParams.get("fim") }, avisos });
          return;
        }

        // Histórico: /api/analytics/historico/:servicoId
        const matchHistorico = url.pathname.match(/^\/api\/analytics\/historico\/(\d+)$/);
        if (matchHistorico) {
          if (aplicarCenario()) return;
          const servicoId = Number(matchHistorico[1]);
          const inicio = url.searchParams.get("inicio") ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const fim = url.searchParams.get("fim") ?? new Date().toISOString();
          responder(200, historicoMock(servicoId, inicio, fim));
          return;
        }

        // Login: aceita qualquer email/senha
        if (url.pathname === "/api/auth/login") {
          if (aplicarCenario()) return;
          // Gera JWT válido com exp em 1 hora (token.ts valida expiração)
          const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
          const exp = Math.floor(Date.now() / 1000) + 3600;
          const payload = btoa(JSON.stringify({ sub: "1", name: "Usuário Mock", email: "mock@teste.com", exp }));
          const signature = "mock-signature";
          const token = `${header}.${payload}.${signature}`;
          responder(200, { token, usuario: { id: 1, nome: "Usuário Mock", email: "mock@teste.com" } });
          return;
        }

        // Indicadores
        if (url.pathname === "/api/dashboard/indicadores") {
          if (aplicarCenario()) {
            if (cenarioAtual === "vazio") {
              responder(200, indicadores(true));
            }
            return;
          }
          responder(200, indicadores(false));
          return;
        }

        // Serviços
        if (url.pathname === "/api/services") {
          if (aplicarCenario()) {
            if (cenarioAtual === "vazio") {
              responder(200, servicosVazio());
            }
            return;
          }
          responder(200, servicos());
          return;
        }

        next();
      });
    },
  };
}