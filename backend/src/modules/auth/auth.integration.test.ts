import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { decodeJwt } from "jose";
import type { LoginAutenticado } from "./auth.service.ts";

// Exige o ambiente de desenvolvimento com schema e seed; não altera os dados do banco.
const destinos = [
  { nome: "backend direto", base: process.env.TEST_API_URL ?? "http://127.0.0.1:3000" },
  { nome: "proxy do frontend", base: process.env.TEST_PROXY_URL ?? "http://127.0.0.1:8080/api" },
];

for (const { nome, base } of destinos) {
  test(`autenticação com PostgreSQL real: ${nome}`, async (t) => {
    const url = base.replace(/\/$/, "");
    let token: string;
    const requisitar = (caminho: string, opcoes: RequestInit = {}) => fetch(`${url}${caminho}`, {
      ...opcoes, signal: AbortSignal.timeout(10_000),
    });

    await t.test("backend consegue consultar PostgreSQL", async () => {
      const resposta = await requisitar("/health/ready");
      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), { status: "ok", database: "connected" });
    });

    await t.test("configuração rejeita acesso sem token", async () => {
      const resposta = await requisitar("/monitoring-settings");
      assert.equal(resposta.status, 401);
    });

    await t.test("credenciais do seed geram JWT sem expor o hash", async () => {
      const resposta = await requisitar("/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "teste@greener.com", senha: "greener123" }),
      });
      assert.equal(resposta.status, 200);
      const dados = await resposta.json() as LoginAutenticado;
      token = dados.token;
      assert.deepEqual(Object.keys(dados), ["token"]);
      assert.match(decodeJwt(token).sub ?? "", /^[1-9]\d*$/);
      assert.ok(!JSON.stringify(dados).includes("senha"));
      assert.equal(resposta.headers.get("cache-control"), "no-store");
    });

    await t.test("token retornado pelo login libera a configuração", async () => {
      const resposta = await requisitar("/monitoring-settings", { headers: { authorization: `Bearer ${token}` } });
      assert.equal(resposta.status, 200);
      const dados = await resposta.json() as { intervaloColetaSegundos: unknown };
      assert.ok(typeof dados.intervaloColetaSegundos === "number"
        && Number.isSafeInteger(dados.intervaloColetaSegundos)
        && dados.intervaloColetaSegundos > 0);
    });

    await t.test("adulteração do token é recusada", async () => {
      const partes = token.split(".");
      partes[1] = Buffer.from(JSON.stringify({ ...decodeJwt(token), sub: "999" })).toString("base64url");
      const resposta = await requisitar("/monitoring-settings", {
        headers: { authorization: `Bearer ${partes.join(".")}` },
      });
      assert.equal(resposta.status, 401);
    });

    await t.test("senha incorreta é recusada", async () => {
      const resposta = await requisitar("/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "teste@greener.com", senha: "senha-incorreta" }),
      });
      assert.equal(resposta.status, 401);
      assert.deepEqual(await resposta.json(), { error: "invalid_credentials", message: "E-mail ou senha inválidos." });
    });
  });
}

test("limite de login é compartilhado entre backend direto e proxy sem bloquear outros e-mails", async (t) => {
  const email = `limite-${randomUUID()}@greener.com`;
  const tentarLogin = (base: string, credenciais = { email, senha: "senha-incorreta" }, origem = "203.0.113.1") =>
    fetch(`${base.replace(/\/$/, "")}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": origem },
      body: JSON.stringify(credenciais),
      signal: AbortSignal.timeout(10_000),
    });

  await t.test("cinco falhas alternando os acessos consomem uma única cota", async () => {
    for (let i = 0; i < 5; i += 1) {
      const resposta = await tentarLogin(destinos[i % destinos.length]!.base, undefined, `203.0.113.${i + 1}`);
      assert.equal(resposta.status, 401);
      assert.deepEqual(await resposta.json(), { error: "invalid_credentials", message: "E-mail ou senha inválidos." });
    }
  });

  await t.test("ambos os acessos retornam 429 e Retry-After mesmo trocando X-Forwarded-For", async () => {
    for (const { base } of destinos) {
      const resposta = await tentarLogin(base, { email: ` ${email} `, senha: "greener123" }, "198.51.100.1");
      assert.equal(resposta.status, 429);
      assert.equal(resposta.headers.get("cache-control"), "no-store");
      const espera = Number(resposta.headers.get("retry-after"));
      assert.ok(Number.isInteger(espera) && espera > 0 && espera <= 300);
      assert.deepEqual(await resposta.json(), {
        error: "too_many_requests", message: "Muitas tentativas de login. Aguarde antes de tentar novamente.",
      });
    }
  });

  await t.test("outro e-mail autentica pelo mesmo proxy e mantém acesso à configuração", async () => {
    const proxy = destinos[1]!.base.replace(/\/$/, "");
    const resposta = await tentarLogin(proxy, { email: "teste@greener.com", senha: "greener123" });
    assert.equal(resposta.status, 200);
    const { token } = await resposta.json() as LoginAutenticado;
    const configuracao = await fetch(`${proxy}/monitoring-settings`, {
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000),
    });
    assert.equal(configuracao.status, 200);
  });
});
