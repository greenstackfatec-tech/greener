import assert from "node:assert/strict";
import test from "node:test";
import { montarLocalizacao, NAO_INFORMADO } from "./services.localizacao.ts";

test("localização completa mostra país, região e cidade", () => {
  assert.deepEqual(
    montarLocalizacao({ pais: "Brasil", regiao: "sa-east-1", cidade: "São Paulo" }),
    { pais: "Brasil", regiao: "sa-east-1", cidade: "São Paulo" },
  );
});

test("campo ausente vira \"Não informado\" sem afetar os demais", () => {
  assert.equal(NAO_INFORMADO, "Não informado");
  assert.deepEqual(
    montarLocalizacao({ pais: "Brasil", regiao: "sa-east-1", cidade: null }),
    { pais: "Brasil", regiao: "sa-east-1", cidade: NAO_INFORMADO },
  );
  assert.deepEqual(
    montarLocalizacao({ pais: null, regiao: null, cidade: "Campinas" }),
    { pais: NAO_INFORMADO, regiao: NAO_INFORMADO, cidade: "Campinas" },
  );
});

test("serviço sem nenhuma localização (campos nulos, vazios ou omitidos)", () => {
  const todosNaoInformados = { pais: NAO_INFORMADO, regiao: NAO_INFORMADO, cidade: NAO_INFORMADO };
  assert.deepEqual(montarLocalizacao({ pais: null, regiao: null, cidade: null }), todosNaoInformados);
  assert.deepEqual(montarLocalizacao({ pais: "", regiao: "   ", cidade: "\t" }), todosNaoInformados);
  assert.deepEqual(montarLocalizacao({}), todosNaoInformados);
});
