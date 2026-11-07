import type { Plugin, Connect } from "vite";

/**
 * Só para desenvolvimento: responde GET /api/services e GET /api/dashboard/indicadores
 * sem backend nem banco.
 * Ligado por `npm run dev:mock`. Para trocar o cenário, abra no navegador
 * http://localhost:5173/api/__mock?cenario=ok|vazio|erro|lento|rede e clique em "Atualizar dados".
 */
type Cenario = "ok" | "vazio" | "erro" | "lento" | "rede";
const CENARIOS: Cenario[] = ["ok", "vazio", "erro", "lento", "rede"];

function servicos() {
  const minutosAtras = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
  const base = { cidade: "São Paulo", latitude: -23.55, longitude: -46.63, regiao: "sa-east-1", pais: "Brasil" };
  const vazio = { cpuPercentual: null, memoriaGb: null, discoGb: null, redeGb: null, energiaKwh: null, emissaoCo2eG: null };
  return [
    { id: 1, nome: "Billing API", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(4), cpuPercentual: 42, memoriaGb: 1.2, discoGb: 20, redeGb: 3.1, energiaKwh: 2.486, emissaoCo2eG: 120.5, ...base },
    { id: 2, nome: "Checkout Web", status: "ativo", statusColeta: "sucesso", coletadoEm: minutosAtras(2), cpuPercentual: 67.5, memoriaGb: 2.8, discoGb: 35, redeGb: 8.4, energiaKwh: 1.912, emissaoCo2eG: 92.7, ...base },
    { id: 3, nome: "Auth Service", status: "indisponivel", statusColeta: "indisponivel", coletadoEm: minutosAtras(30), ...vazio, ...base },
    { id: 4, nome: "Reports Worker", status: "ativo", statusColeta: "sem_metricas", coletadoEm: null, ...vazio, ...base },
    { id: 5, nome: "Notifications", status: "ativo", statusColeta: null, coletadoEm: null, ...vazio, ...base },
    { id: 6, nome: "Legacy Cron", status: "removido", statusColeta: null, coletadoEm: null, ...vazio, ...base },
  ];
}

/** Mesma regra do backend: totais da última coleta bem-sucedida; contagens por status do serviço (sem removidos). */
function indicadores(zerados: boolean) {
  const lista = zerados ? [] : servicos();
  const comColeta = lista.filter((s) => s.statusColeta === "sucesso");
  const soma = (campo: "energiaKwh" | "emissaoCo2eG") => comColeta.reduce((total, s) => total + (s[campo] ?? 0), 0);
  return {
    consumo_total_kwh: Number(soma("energiaKwh").toFixed(8)),
    emissao_total_co2e_g: Number(soma("emissaoCo2eG").toFixed(8)),
    servicos_ativos: lista.filter((s) => s.status === "ativo").length,
    servicos_indisponiveis: lista.filter((s) => s.status === "indisponivel").length,
  };
}

export function mockServicos(): Plugin {
  let cenario: Cenario = "ok";
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

        if (url.pathname === "/api/__mock") {
          const pedido = url.searchParams.get("cenario") as Cenario | null;
          if (pedido && CENARIOS.includes(pedido)) cenario = pedido;
          responder(200, { cenario, opcoes: CENARIOS });
          return;
        }
        const ehIndicadores = url.pathname === "/api/dashboard/indicadores";
        if (url.pathname !== "/api/services" && !ehIndicadores) {
          next();
          return;
        }

        if (cenario === "rede") {
          req.socket?.destroy();
          return;
        }
        const entregar = () => {
          if (cenario === "erro") responder(502, { error: "bad_gateway", message: "Mock: backend fora do ar" });
          else if (ehIndicadores) responder(200, indicadores(cenario === "vazio"));
          else responder(200, cenario === "vazio" ? [] : servicos());
        };
        if (cenario === "lento") setTimeout(entregar, 3000);
        else entregar();
      });
    },
  };
}
