import assert from "node:assert/strict";
import test from "node:test";
import { ErroApi, ErroConfiguracaoApi } from "../../integrations/api-client.ts";
import { criarMonitoramentoColeta, criarFalhaPublica } from "./collections.monitoring.ts";

test("diagnóstico distingue início, lista validada, coleta verificada e falha", () => {
  let agora = new Date("2026-01-01T00:00:00Z");
  const monitor = criarMonitoramentoColeta(() => agora);
  assert.equal(monitor.consultar().situacao, "aguardando");
  const descoberta = monitor.iniciar({ etapa: "descoberta" });
  monitor.descobertaValida(descoberta, ["a"]);
  assert.equal(monitor.consultar().situacao, "aguardando");
  monitor.iniciarColeta();
  monitor.concluirColeta("a", true);
  assert.equal(monitor.consultar().situacao, "ok");
  agora = new Date("2026-01-01T00:01:00Z");
  monitor.falhar(monitor.iniciar({ etapa: "descoberta" }), new ErroApi("timeout", "segredo"));
  const estado = monitor.consultar();
  assert.equal(estado.situacao, "degradado");
  assert.equal(estado.ultimaTentativaDescobertaEm, agora.toISOString());
  assert.equal(estado.ultimaDescobertaValidaEm, "2026-01-01T00:00:00.000Z");
  assert.equal(estado.ultimaColetaCompletaEm, "2026-01-01T00:00:00.000Z");
  assert.ok(!JSON.stringify(estado).includes("segredo"));
});

test("recuperação resolve somente a etapa e o ID correspondentes", () => {
  const monitor = criarMonitoramentoColeta();
  monitor.descobertaValida(monitor.iniciar({ etapa: "descoberta" }), ["a", "b"]);
  const a = monitor.iniciar({ etapa: "metricas", idExterno: "a", servicoNome: "Mesmo nome" });
  const b = monitor.iniciar({ etapa: "metricas", idExterno: "b", servicoNome: "Mesmo nome" });
  const carbono = monitor.iniciar({ etapa: "carbono", idExterno: "a" });
  for (const tentativa of [a, b, carbono]) monitor.falhar(tentativa, new ErroApi("rede", "detalhe"));
  monitor.concluir(a);
  assert.deepEqual(monitor.consultar().falhasAtivas.map((f) => [f.etapa, f.idExterno]), [["metricas", "b"], ["carbono", "a"]]);
  const copia = monitor.consultar();
  copia.falhasAtivas[0].mensagem = "alterada";
  copia.falhasAtivas.length = 0;
  assert.equal(monitor.consultar().falhasAtivas.length, 2);
  assert.notEqual(monitor.consultar().falhasAtivas[0].mensagem, "alterada");
});

test("conclusões antigas da descoberta não apagam falha ou lista mais recente", () => {
  const monitor = criarMonitoramentoColeta();
  const antiga = monitor.iniciar({ etapa: "descoberta" });
  const nova = monitor.iniciar({ etapa: "descoberta" });
  monitor.falhar(nova, new ErroApi("timeout", "timeout"));
  monitor.descobertaValida(antiga, []);
  assert.equal(monitor.consultar().situacao, "degradado");
  monitor.descobertaValida(nova, []);
  monitor.falhar(antiga, new ErroApi("rede", "atrasada"));
  assert.equal(monitor.consultar().situacao, "ok");
});

test("somente uma lista válida descarta diagnósticos de serviços ausentes", () => {
  const monitor = criarMonitoramentoColeta();
  const falhaServico = monitor.iniciar({ etapa: "carbono", idExterno: "a" });
  monitor.falhar(falhaServico, new ErroApi("http", "erro", { statusHttp: 503 }));
  monitor.falhar(monitor.iniciar({ etapa: "descoberta" }), new ErroApi("rede", "erro"));
  assert.equal(monitor.consultar().falhasAtivas.length, 2);
  monitor.descobertaValida(monitor.iniciar({ etapa: "descoberta" }), []);
  monitor.falhar(falhaServico, new ErroApi("timeout", "resposta atrasada"));
  assert.equal(monitor.consultar().situacao, "ok");
  assert.deepEqual(monitor.consultar().falhasAtivas, []);
  assert.equal(criarMonitoramentoColeta().consultar().situacao, "aguardando");
});

test("falhas públicas têm códigos locais sem mensagens ou códigos arbitrários do fornecedor", () => {
  const falha = criarFalhaPublica(new ErroApi("http", "senha=segredo", {
    statusHttp: 500, codigoApi: "SQL segredo", cause: new Error("stack interno"),
  }), { etapa: "carbono", idExterno: "a" }, "2026-01-01T00:00:00Z");
  assert.equal(falha.codigo, "API_CARBONO_HTTP");
  assert.equal(falha.statusHttp, 500);
  assert.ok(!JSON.stringify(falha).includes("segredo"));
  const configuracao = criarFalhaPublica(new ErroConfiguracaoApi("URL privada"), { etapa: "descoberta" }, "agora");
  assert.equal(configuracao.etapa, "configuracao");
  assert.equal(configuracao.tipo, "interno");
});
