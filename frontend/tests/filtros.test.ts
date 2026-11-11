import assert from "node:assert/strict";
import test from "node:test";
import {
  FILTROS_PADRAO,
  filtrarPorServicoERegiao,
  paraCampoDataHora,
  regioesDisponiveis,
  resolverPeriodo,
} from "../src/filtros.ts";
import { NAO_INFORMADO } from "../src/localizacao.ts";

const AGORA = new Date("2026-11-10T12:00:00.000Z").getTime();
const HORA = 60 * 60 * 1000;

const servicos = [
  { id: 1, nome: "API", pais: "Brasil", regiao: "Sudeste", cidade: "São Paulo" },
  { id: 2, nome: "Fila", pais: "Brasil", regiao: "Nordeste", cidade: null },
  { id: 3, nome: "Cache", pais: null, regiao: null, cidade: null },
  { id: 4, nome: "Banco", pais: "Brasil", regiao: "Sudeste", cidade: "Campinas" },
];

test("atalhos de período terminam agora e voltam 1 h, 24 h ou 7 dias", () => {
  for (const [periodo, duracao] of [["1h", HORA], ["24h", 24 * HORA], ["7d", 7 * 24 * HORA]] as const) {
    assert.deepEqual(resolverPeriodo({ ...FILTROS_PADRAO, periodo }, AGORA), {
      inicio: new Date(AGORA - duracao),
      fim: new Date(AGORA),
    });
  }
});

test("período personalizado válido devolve início e fim informados", () => {
  const inicio = new Date(AGORA - 2 * HORA);
  const fim = new Date(AGORA - HORA);
  const periodo = resolverPeriodo(
    { ...FILTROS_PADRAO, periodo: "personalizado", inicio: paraCampoDataHora(inicio), fim: paraCampoDataHora(fim) },
    AGORA,
  );
  assert.deepEqual(periodo, { inicio, fim });
});

test("período personalizado inválido é recusado com mensagem", () => {
  const base = { ...FILTROS_PADRAO, periodo: "personalizado" as const };
  assert.deepEqual(resolverPeriodo({ ...base, inicio: "", fim: "2026-11-10T10:00" }, AGORA), {
    erro: "Informe o início e o fim do período.",
  });
  assert.deepEqual(resolverPeriodo({ ...base, inicio: "2026-11-10T10:00", fim: "2026-11-10T09:00" }, AGORA), {
    erro: "O início precisa ser anterior ao fim.",
  });
  assert.deepEqual(resolverPeriodo({ ...base, inicio: "2026-11-10T10:00", fim: "2026-11-10T10:00" }, AGORA), {
    erro: "O início precisa ser anterior ao fim.",
  });
  assert.deepEqual(resolverPeriodo({ ...base, inicio: "ontem", fim: "2026-11-10T10:00" }, AGORA), {
    erro: "Informe datas válidas.",
  });
});

test("regiões disponíveis são únicas, ordenadas e terminam com os serviços sem região", () => {
  assert.deepEqual(regioesDisponiveis(servicos), ["Nordeste", "Sudeste", NAO_INFORMADO]);
});

test("filtra por serviço, por região e pelos dois juntos", () => {
  const ids = (filtros: Partial<typeof FILTROS_PADRAO>) =>
    filtrarPorServicoERegiao(servicos, { ...FILTROS_PADRAO, ...filtros }).map((s) => s.id);

  assert.deepEqual(ids({}), [1, 2, 3, 4]);
  assert.deepEqual(ids({ servicoId: 2 }), [2]);
  assert.deepEqual(ids({ regiao: "Sudeste" }), [1, 4]);
  assert.deepEqual(ids({ regiao: NAO_INFORMADO }), [3]);
  assert.deepEqual(ids({ servicoId: 2, regiao: "Sudeste" }), []);
});
