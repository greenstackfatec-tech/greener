import assert from "node:assert/strict";
import test from "node:test";
import {
  CENTRO_PADRAO, agruparPorLocal, centroDosPontos, coordenadasValidas, descricaoDoLocal,
  formatarCoordenada, interpolarCentro, limitarCentro, separarPorCoordenadas, visivelNoGlobo,
} from "../src/mapa.ts";
import type { Servico } from "../src/services/servicos.ts";

function servico(id: number, latitude: number | null, longitude: number | null): Servico {
  return {
    id, nome: `Serviço ${id}`, status: "ativo", cidade: null, latitude, longitude, regiao: null, pais: null,
    coletadoEm: null, statusColeta: null, cpuPercentual: null, memoriaGb: null, discoGb: null,
    redeGb: null, energiaKwh: null, emissaoCo2eG: null,
  };
}

test("coordenadas válidas respeitam os limites do DD05 e aceitam zero", () => {
  assert.equal(coordenadasValidas(-23.5505, -46.6333), true);
  assert.equal(coordenadasValidas(0, 0), true);
  assert.equal(coordenadasValidas(90, 180), true);
  assert.equal(coordenadasValidas(90.1, 0), false);
  assert.equal(coordenadasValidas(0, -180.1), false);
  assert.equal(coordenadasValidas(null, 10), false);
  assert.equal(coordenadasValidas(10, null), false);
  assert.equal(coordenadasValidas(Number.NaN, 10), false);
});

test("serviço sem coordenadas sai do mapa mas é contado; coordenada zero não é ausência", () => {
  const lista = [servico(1, -23.5, -46.6), servico(2, null, null), servico(3, 0, 0), servico(4, -23.5, null), servico(5, 200, 0)];
  const { noMapa, foraDoMapa } = separarPorCoordenadas(lista);
  assert.deepEqual(noMapa.map((s) => s.id), [1, 3]);
  assert.deepEqual(foraDoMapa.map((s) => s.id), [2, 4, 5]);
});

test("serviços no mesmo ponto viram um grupo só", () => {
  const { noMapa } = separarPorCoordenadas([
    servico(1, -23.5505, -46.6333), servico(2, 39.0438, -77.4874), servico(3, -23.5505, -46.6333),
  ]);
  const grupos = agruparPorLocal(noMapa);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos[0].servicos.map((s) => s.id), [1, 3]);
});

test("coordenada é mostrada como a API enviou, no padrão pt-BR", () => {
  assert.equal(formatarCoordenada(-23.5505), "-23,5505");
  assert.equal(formatarCoordenada(139.6503), "139,6503");
  assert.equal(formatarCoordenada(0), "0");
});

test("descrição do local usa só o que existe", () => {
  assert.equal(descricaoDoLocal({ cidade: "Dublin", regiao: "Leinster", pais: "Ireland" }), "Dublin · Leinster · Ireland");
  assert.equal(descricaoDoLocal({ cidade: null, regiao: "Leinster", pais: null }), "Leinster");
  assert.equal(descricaoDoLocal({ cidade: null, regiao: null, pais: null }), "Local não informado");
});

test("pino do outro lado do planeta não é visível", () => {
  const centro = { lat: -23.55, lng: -46.63 };
  assert.equal(visivelNoGlobo(-23.55, -46.63, centro), true);
  assert.equal(visivelNoGlobo(39.04, -77.49, centro), true);
  assert.equal(visivelNoGlobo(35.68, 139.65, centro), false);
  assert.equal(visivelNoGlobo(23.55, 133.37, centro), false);
});

test("centro dos pontos: sem pontos usa o padrão, com pontos fica entre eles", () => {
  assert.deepEqual(centroDosPontos([]), CENTRO_PADRAO);
  const meio = centroDosPontos([{ latitude: 0, longitude: 10 }, { latitude: 0, longitude: 30 }]);
  assert.ok(Math.abs(meio.lat) < 1e-9);
  assert.ok(Math.abs(meio.lng - 20) < 1e-9);
  assert.deepEqual(centroDosPontos([{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 }]), CENTRO_PADRAO);
});

test("animação gira pelo caminho mais curto e limites do centro são respeitados", () => {
  const meio = interpolarCentro({ lat: 0, lng: 170 }, { lat: 10, lng: -170 }, 0.5);
  assert.ok(Math.abs(Math.abs(meio.lng) - 180) < 1e-9);
  assert.equal(meio.lat, 5);
  assert.deepEqual(interpolarCentro({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 1), { lat: 3, lng: 4 });
  assert.deepEqual(limitarCentro({ lat: 120, lng: 190 }), { lat: 85, lng: -170 });
  assert.deepEqual(limitarCentro({ lat: -120, lng: -190 }), { lat: -85, lng: 170 });
});
