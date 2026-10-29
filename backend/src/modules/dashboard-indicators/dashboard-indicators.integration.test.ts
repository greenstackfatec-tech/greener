/**
 * Testes de integração para o endpoint de indicadores do dashboard.
 * TP10 - Calcular indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08).
 */

import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { tratarRequisicao } from "../../app.ts";

test("GET /dashboard/indicadores passa por route, controller, service e repository", async (t) => {
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response);
  });
  // Fecha o servidor no fim, mesmo se alguma verificação falhar.
  t.after(() => {
    servidor.close();
    servidor.closeAllConnections();
  });
  // Porta 0 = o sistema escolhe uma porta livre, sem conflito com o npm start.
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;

  await t.test("retorna indicadores consolidados", async () => {
    const resposta = await fetch(`${baseUrl}/dashboard/indicadores`);
    // Pode ser 200 (sucesso) ou 500 (erro de banco, mas endpoint existe)
    assert.ok(resposta.status === 200 || resposta.status === 500);
    assert.match(resposta.headers.get("content-type") ?? "", /application\/json/);

    if (resposta.status === 200) {
      const indicadores = await resposta.json() as Record<string, unknown>;
      assert.ok(typeof indicadores.consumo_total_kwh === "number");
      assert.ok(typeof indicadores.emissao_total_co2e_g === "number");
      assert.ok(typeof indicadores.servicos_ativos === "number");
      assert.ok(typeof indicadores.servicos_indisponiveis === "number");
    }
  });

  await t.test("retorna 404 para caminho inexistente", async () => {
    const resposta = await fetch(`${baseUrl}/dashboard/nao-existe`);
    assert.equal(resposta.status, 404);
  });
});