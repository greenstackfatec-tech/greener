import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { tratarRequisicao } from "../../app.ts";
import { encerrarConexao } from "../../db/connection.ts";
import type { Servico } from "./services.repository.ts";

test("GET /services passa por route, controller, service e repository", async (t) => {
  const servidor = createServer((request, response) => {
    void tratarRequisicao(request, response);
  });
  // Fecha o servidor no fim, mesmo se alguma verificação falhar.
  t.after(async () => {
    servidor.close();
    servidor.closeAllConnections();
    await encerrarConexao();
  });
  // Porta 0 = o sistema escolhe uma porta livre, sem conflito com o npm start.
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  const baseUrl = `http://127.0.0.1:${endereco.port}`;

  await t.test("lista os serviços em JSON", async () => {
    const resposta = await fetch(`${baseUrl}/services`);
    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get("content-type") ?? "", /application\/json/);
    const servicos = (await resposta.json()) as Servico[];
    assert.ok(servicos.length >= 8, "o seed tem 8 serviços");
    assert.equal(servicos[0]?.nome, "Billing API");
  });

  await t.test("GET /services/:id devolve um serviço só", async () => {
    const lista = (await (await fetch(`${baseUrl}/services`)).json()) as Servico[];
    const resposta = await fetch(`${baseUrl}/services/${lista[0].id}`);
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), lista[0]);
  });

  await t.test("GET /services/:id de serviço que não existe responde 404 em JSON", async () => {
    const resposta = await fetch(`${baseUrl}/services/999999`);
    assert.equal(resposta.status, 404);
    assert.equal(((await resposta.json()) as { error: string }).error, "not_found");
  });

  await t.test("GET /services/:id com id inválido responde 400", async () => {
    for (const id of ["abc", "0", "-1", "1.5", "99999999999"]) {
      const resposta = await fetch(`${baseUrl}/services/${id}`);
      assert.equal(resposta.status, 400, `id ${id}`);
      assert.equal(((await resposta.json()) as { error: string }).error, "invalid_id");
    }
  });

  await t.test("caminho que não existe responde 404", async () => {
    const resposta = await fetch(`${baseUrl}/nao-existe`);
    assert.equal(resposta.status, 404);
  });
});