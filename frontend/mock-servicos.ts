import type { Plugin, Connect } from "vite";
import type { RankingItem, RankingResposta } from "./src/services/analytics.ts";

/**
 * Mock para desenvolvimento: responde GET /api/services, GET /api/dashboard/indicadores,
 * GET /api/analytics/historico/:servicoId, GET /api/analytics/ranking, POST /api/auth/login e GET /api/__mock
 * sem backend nem banco. Ligado por `npm run dev:mock`.
 */

type CenarioMock = "ok" | "vazio" | "erro" | "lento" | "rede";

let cenarioAtual: CenarioMock = "ok";

function servicos() {
  const minutosAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
  const base = { cidade: "São Paulo", latitude: -23.5505, longitude: -46.6333, regiao: "sa-east-1", pais: "Brasil" };
  // Pontos espalhados pelo globo para testar o mapa (DW15); Billing API e Legacy Cron compartilham São Paulo de propósito.
  const ashburn = { cidade: "Ashburn", latitude: 39.0438, longitude: -77.4874, regiao: "Virginia", pais: "United States" };
  const toquio = { cidade: "Tokyo", latitude: 35.6762, longitude: 139.6503, regiao: "Tokyo", pais: "Japan" };
  const vazio = { cpuPercentual: null, memoriaGb: null, discoGb: null, redeGb: null, energiaKwh: null, emissaoCo2eG: null };
  return [
    { id: 1, nome: "Billing API", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(4), cpuPercentual: 42, memoriaGb: 1.2, discoGb: 20, redeGb: 3.1, energiaKwh: 2.486, emissaoCo2eG: 120.5, ...base },
    { id: 2, nome: "Checkout Web", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(2), cpuPercentual: 67.5, memoriaGb: 2.8, discoGb: 35, redeGb: 8.4, energiaKwh: 1.912, emissaoCo2eG: 92.7, ...ashburn },
    { id: 3, nome: "Auth Service", status: "indisponivel", statusColeta: "indisponivel", coletadoEm: minutosAtras(30), ...vazio, ...toquio },
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

function rankingMock(query: URLSearchParams, vazio: boolean): RankingResposta {
  const aplicacoes = [
    { id: 1, nome: "Green Stack" },
    { id: 2, nome: "Equipe Aurora" },
    { id: 3, nome: "Equipe Raiz" },
  ];
  const servicos = [
    { nome: "EcoCart API", aplicacaoId: 1, energia: 0.21, co2e: 80, coletas: 9, tendencia: -18 },
    { nome: "GreenER Dashboard", aplicacaoId: 1, energia: 0.28, co2e: 110, coletas: 6, tendencia: -12 },
    { nome: "Carbon Track", aplicacaoId: 2, energia: 0.34, co2e: 140, coletas: 6, tendencia: -8 },
    { nome: "Smart Route", aplicacaoId: 2, energia: 0.39, co2e: 160, coletas: 4, tendencia: 2 },
    { nome: "Data Garden", aplicacaoId: 3, energia: 0.42, co2e: 180, coletas: 8, tendencia: 5 },
    { nome: "EcoPay Services", aplicacaoId: 3, energia: 0.47, co2e: 200, coletas: 4, tendencia: 7 },
    { nome: "Green Market", aplicacaoId: 1, energia: 0.51, co2e: 230, coletas: 6, tendencia: 9 },
    { nome: "Reports Worker", aplicacaoId: 1, energia: 0, co2e: 0, coletas: 0, tendencia: null },
  ].map((item, indice) => ({ ...item, servicoId: indice + 1 }));
  const agora = Date.now();
  const inicio = query.get("inicio") ?? new Date(agora - 86_400_000).toISOString();
  const fim = query.get("fim") ?? new Date(agora).toISOString();
  const metrica = query.get("metrica") === "energia" ? "energia" : "co2e";
  const agregacao = query.get("agregacao") === "total" ? "total" : "media";
  const ordenacao = query.get("ordenacao") === "DESC" ? "DESC" : "ASC";
  const aplicacaoId = query.get("aplicacaoId");
  const offset = Number(query.get("offset") ?? 0);
  const limite = Number(query.get("limite") ?? 20);
  const escopo = servicos.filter((item) => aplicacaoId === null || String(item.aplicacaoId) === aplicacaoId);
  const coletaEm = agora - 60_000;
  const noPeriodo = Date.parse(inicio) <= coletaEm && coletaEm <= Date.parse(fim);
  const classificados: RankingItem[] = (vazio || !noPeriodo ? [] : escopo.filter((item) => item.coletas > 0))
    .map((item) => ({
      servicoId: item.servicoId,
      nome: item.nome,
      aplicacao: aplicacoes.find((app) => app.id === item.aplicacaoId)!.nome,
      totalEnergiaKwh: item.energia * item.coletas,
      totalEmissaoCo2eG: item.co2e * item.coletas,
      mediaEnergiaKwh: item.energia,
      mediaEmissaoCo2eG: item.co2e,
      tendenciaPercentual: item.tendencia,
    }));
  const campo = metrica === "energia"
    ? (agregacao === "media" ? "mediaEnergiaKwh" : "totalEnergiaKwh")
    : (agregacao === "media" ? "mediaEmissaoCo2eG" : "totalEmissaoCo2eG");
  const direcao = ordenacao === "ASC" ? 1 : -1;
  classificados.sort((a, b) => direcao * ((a[campo] ?? 0) - (b[campo] ?? 0)) || a.servicoId - b.servicoId);
  const media = (chave: "mediaEnergiaKwh" | "mediaEmissaoCo2eG") => classificados.length
    ? classificados.reduce((soma, item) => soma + (item[chave] ?? 0), 0) / classificados.length
    : null;
  const menor = classificados.reduce<RankingItem | null>((atual, item) =>
    atual === null || (item.mediaEnergiaKwh ?? Infinity) < (atual.mediaEnergiaKwh ?? Infinity) ? item : atual, null);
  return {
    dados: classificados.slice(offset, offset + limite),
    periodo: { inicio, fim },
    metrica,
    agregacao,
    ordenacao,
    aplicacoes,
    resumo: {
      classificados: classificados.length,
      semDados: escopo.length - classificados.length,
      mediaEnergiaKwh: media("mediaEnergiaKwh"),
      mediaEmissaoCo2eG: media("mediaEmissaoCo2eG"),
      menorEnergia: menor?.mediaEnergiaKwh != null ? { nome: menor.nome, mediaEnergiaKwh: menor.mediaEnergiaKwh } : null,
      primeiroColocado: classificados[0] ?? null,
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

        if (url.pathname === "/api/analytics/ranking") {
          if (cenarioAtual === "lento") {
            setTimeout(() => {
              if (!res.destroyed) responder(200, rankingMock(url.searchParams, false));
            }, 1200);
          } else if (cenarioAtual === "vazio" || !aplicarCenario()) {
            responder(200, rankingMock(url.searchParams, cenarioAtual === "vazio"));
          }
          return;
        }

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
