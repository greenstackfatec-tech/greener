import assert from "node:assert/strict";
import test from "node:test";
import { servicos } from "../../mocks/fixtures.ts";
import { criarRotinaColeta, INTERVALO_MAXIMO_SEGUNDOS } from "./collections.scheduler.ts";

async function estabilizar() {
  for (let i = 0; i < 40; i++) await Promise.resolve();
}

function preparar() {
  let agora = 0;
  const timers = new Map<ReturnType<typeof setTimeout>, { quando: number; executar: () => void }>();
  const chamadas: { id: string; quando: number; intervaloAlternativo: number }[] = [];
  const logs: unknown[][] = [];
  const estado = {
    lista: servicos,
    intervaloLocal: 60,
    intervalos: new Map(servicos.map((s) => [s.id, 30])),
    falharListagem: false,
    falharConfiguracao: false,
    falharColeta: new Set<string>(),
    falharDepoisDoIntervalo: false,
    aguardar: new Map<string, Promise<void>>(),
    listagens: 0,
  };
  const rotina = criarRotinaColeta({
    agora: () => agora,
    agendar(executar, milissegundos) {
      assert.ok(milissegundos >= 0 && milissegundos <= 2_147_483_647);
      const timer = {} as ReturnType<typeof setTimeout>;
      timers.set(timer, { executar, quando: agora + milissegundos });
      return timer;
    },
    cancelar(timer) { timers.delete(timer); },
    logger: {
      log: (...args) => { logs.push(args); },
      warn: (...args) => { logs.push(args); },
      error: (...args) => { logs.push(args); },
    },
    async buscarIntervaloAlternativo() {
      if (estado.falharConfiguracao) throw new Error("Banco indisponível");
      return estado.intervaloLocal;
    },
    async listarServicos() {
      estado.listagens++;
      if (estado.falharListagem) throw new Error("API indisponível");
      return estado.lista;
    },
    async coletarServico(servico, intervaloAlternativo, informarIntervalo) {
      chamadas.push({ id: servico.id, quando: agora, intervaloAlternativo });
      await estado.aguardar.get(servico.id);
      if (estado.falharColeta.has(servico.id)) throw new Error("Falha nas métricas");
      informarIntervalo(estado.intervalos.get(servico.id)!);
      if (estado.falharDepoisDoIntervalo) throw new Error("Falha na persistência");
      return { servicoId: 1, servicoNome: servico.name, status: "sucesso" };
    },
  });
  async function avancar(milissegundos: number) {
    await estabilizar();
    const limite = agora + milissegundos;
    let disparos = 0;
    while (true) {
      const proximo = [...timers].sort((a, b) => a[1].quando - b[1].quando)[0];
      if (!proximo || proximo[1].quando > limite) break;
      assert.ok(++disparos < 1000, "O agendador entrou em um laço sem espera");
      agora = proximo[1].quando;
      timers.delete(proximo[0]);
      proximo[1].executar();
      await estabilizar();
    }
    agora = limite;
  }
  const horarios = (id = servicos[0].id) => chamadas.filter((c) => c.id === id).map((c) => c.quando);
  return { rotina, estado, chamadas, logs, timers, avancar, horarios };
}

test("TP06 inicia imediatamente, usa 30s da API e passa a usar 90s sem reiniciar", async () => {
  const { rotina, estado, avancar, horarios } = preparar();
  assert.equal(rotina.status().executando, false);
  assert.equal(rotina.iniciar(), true);
  assert.equal(rotina.iniciar(), false);
  await avancar(0);
  assert.deepEqual(horarios(), [0]);
  await avancar(29_999);
  assert.deepEqual(horarios(), [0]);
  estado.intervalos.set(servicos[0].id, 90);
  await avancar(1);
  assert.deepEqual(horarios(), [0, 30_000]);
  await avancar(89_999);
  assert.deepEqual(horarios(), [0, 30_000]);
  await avancar(1);
  assert.deepEqual(horarios(), [0, 30_000, 120_000]);
  await rotina.parar();
});

test("intervalos de 1s e 120s são independentes e não sofrem a restrição antiga de 10s", async () => {
  const { rotina, estado, avancar, horarios } = preparar();
  estado.intervalos.set(servicos[0].id, 1);
  estado.intervalos.set(servicos[1].id, 120);
  rotina.iniciar();
  await avancar(120_000);
  assert.equal(horarios().length, 121);
  assert.deepEqual(horarios(servicos[1].id), [0, 120_000]);
  await rotina.parar();
});

test("zero e estouro usam intervalo local validado, sem consultas contínuas", async () => {
  for (const intervalo of [0, INTERVALO_MAXIMO_SEGUNDOS + 1]) {
    const { rotina, estado, avancar, horarios, logs } = preparar();
    estado.intervaloLocal = 45;
    estado.intervalos.set(servicos[0].id, intervalo);
    rotina.iniciar();
    await avancar(44_999);
    assert.deepEqual(horarios(), [0]);
    await avancar(1);
    assert.deepEqual(horarios(), [0, 45_000]);
    assert.ok(logs.some((l) => String(l[0]).includes("não agendável")));
    await rotina.parar();
  }
});

test("zero e falhas posteriores mantêm o último intervalo válido do serviço", async () => {
  const { rotina, estado, avancar, horarios, chamadas } = preparar();
  rotina.iniciar(10);
  await avancar(0);
  estado.intervalos.set(servicos[0].id, 0);
  await avancar(30_000);
  estado.falharColeta.add(servicos[0].id);
  await avancar(30_000);
  estado.falharColeta.clear();
  await avancar(30_000);
  assert.deepEqual(horarios(), [0, 30_000, 60_000, 90_000]);
  assert.deepEqual(chamadas.filter((c) => c.id === servicos[0].id).map((c) => c.intervaloAlternativo), [10, 30, 30, 30]);
  await rotina.parar();
});

test("falha de listagem e de configuração não encerra a rotina; o padrão é 60s", async () => {
  const { rotina, estado, avancar, horarios, logs } = preparar();
  estado.falharConfiguracao = true;
  estado.falharListagem = true;
  rotina.iniciar();
  await avancar(0);
  assert.deepEqual(horarios(), []);
  estado.falharListagem = false;
  await avancar(60_000);
  assert.deepEqual(horarios(), [60_000]);
  assert.equal(rotina.status().executando, true);
  assert.ok(logs.some((l) => l.some((v) => v instanceof Error)));
  await rotina.parar();
});

test("lista vazia e configuração local inválida são consultadas novamente", async () => {
  const { rotina, estado, avancar, horarios } = preparar();
  estado.lista = [];
  estado.intervaloLocal = -1;
  rotina.iniciar();
  await avancar(60_000);
  assert.equal(estado.listagens, 2);
  assert.deepEqual(horarios(), []);
  estado.lista = servicos;
  await avancar(60_000);
  assert.deepEqual(horarios(), [120_000]);
  await rotina.parar();
});

test("falha de um serviço e de persistência não impede outros nem futuras tentativas", async () => {
  const { rotina, estado, avancar, horarios } = preparar();
  estado.falharColeta.add(servicos[0].id);
  rotina.iniciar();
  await avancar(60_000);
  assert.deepEqual(horarios(), [0, 60_000]);
  assert.deepEqual(horarios(servicos[1].id), [0, 30_000, 60_000]);
  estado.falharColeta.clear();
  estado.falharDepoisDoIntervalo = true;
  await avancar(60_000);
  estado.falharDepoisDoIntervalo = false;
  await avancar(30_000);
  assert.deepEqual(horarios(), [0, 60_000, 120_000, 150_000]);
  assert.equal(rotina.status().coletasEmAndamento, 0);
  await rotina.parar();
});

test("serviço lento não se sobrepõe nem bloqueia os demais; intervalo começa após terminar", async () => {
  const { rotina, estado, avancar, horarios } = preparar();
  let liberar!: () => void;
  estado.aguardar.set(servicos[0].id, new Promise<void>((resolve) => { liberar = resolve; }));
  rotina.iniciar();
  await avancar(90_000);
  assert.deepEqual(horarios(), [0]);
  assert.deepEqual(horarios(servicos[1].id), [0, 30_000, 60_000, 90_000]);
  liberar();
  await avancar(29_999);
  assert.deepEqual(horarios(), [0]);
  await avancar(1);
  assert.deepEqual(horarios(), [0, 120_000]);
  await rotina.parar();
});

test("parar aguarda coleta pendente, impede reinício durante a parada e não rearma timers", async () => {
  const { rotina, estado, avancar, horarios, timers } = preparar();
  let liberar!: () => void;
  estado.aguardar.set(servicos[0].id, new Promise<void>((resolve) => { liberar = resolve; }));
  rotina.iniciar();
  await avancar(0);
  let parou = false;
  const parada = rotina.parar().then(() => { parou = true; });
  assert.equal(rotina.iniciar(), false);
  await avancar(120_000);
  assert.equal(parou, false);
  liberar();
  await parada;
  assert.equal(timers.size, 0);
  await avancar(120_000);
  assert.deepEqual(horarios(), [0]);
  assert.equal(rotina.iniciar(), true);
  await avancar(0);
  await rotina.parar();
});

test("encerrar durante a descoberta aguarda o trabalho e impede qualquer novo início", async () => {
  const { rotina, avancar, timers } = preparar();
  rotina.iniciar();
  await rotina.encerrar();
  await avancar(120_000);
  assert.equal(timers.size, 0);
  assert.equal(rotina.iniciar(), false);
});

test("valida o intervalo alternativo antes de iniciar", () => {
  for (const valor of [0, -1, NaN, Infinity, 1.5, INTERVALO_MAXIMO_SEGUNDOS + 1]) {
    const { rotina } = preparar();
    assert.throws(() => rotina.iniciar(valor), TypeError);
    assert.equal(rotina.status().executando, false);
  }
});
