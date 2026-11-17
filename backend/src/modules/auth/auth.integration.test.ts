import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { decodeJwt } from "jose";
import { compare } from "bcryptjs";
import { consultar, encerrarConexao } from "../../db/connection.ts";
import type { LoginAutenticado } from "./auth.service.ts";

// Os testes de login exigem schema e seed e não alteram os dados do banco.
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

// Ative TEST_AUTH_REGISTRATION=true somente com PostgreSQL isolado para os testes de cadastro.
test("cadastro com PostgreSQL real pelo backend e proxy", {
  skip: process.env.TEST_AUTH_REGISTRATION !== "true",
}, async (t) => {
  const ids: string[] = [];
  t.after(async () => {
    try {
      if (ids.length > 0) await consultar("DELETE FROM usuarios WHERE id = ANY($1::bigint[])", [ids]);
    } finally {
      await encerrarConexao();
    }
  });

  for (const { nome: destino, base } of destinos) {
    await t.test(destino, async () => {
      const url = base.replace(/\/$/, "");
      const cadastrar = (dados: unknown) => fetch(`${url}/auth/register`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(dados), signal: AbortSignal.timeout(10_000),
      });
      for (const tipoPessoa of ["fisica", "juridica"]) {
        const email = `cadastro-${randomUUID()}@example.com`;
        const senha = " SenhaTeste123! ";
        const dados = { nome: "  Conta de Teste  ", email: ` ${email} `, senha, tipoPessoa, documento: "" };
        const resposta = await cadastrar(dados);
        assert.equal(resposta.status, 201);
        assert.equal(resposta.headers.get("cache-control"), "no-store");
        const criada = await resposta.json() as { id: string };
        ids.push(criada.id);
        assert.deepEqual(Object.keys(criada), ["id"]);
        assert.match(criada.id, /^[1-9]\d*$/);
        const registro = await consultar<{ id: string; nome: string; email: string; senha_hash: string }>(
          "SELECT id::text, nome, email, senha_hash FROM usuarios WHERE id = $1", [criada.id],
        );
        const usuario = registro.rows[0];
        assert.equal(usuario.nome, "Conta de Teste");
        assert.equal(usuario.email, email);
        assert.match(usuario.senha_hash, /^\$2[aby]\$10\$/);
        assert.notEqual(usuario.senha_hash, senha);
        assert.equal(await compare(senha, usuario.senha_hash), true);

        const repetida = await cadastrar({ ...dados, senha: "OutraSenha123!" });
        assert.equal(repetida.status, 409);
        assert.deepEqual(await repetida.json(), { error: "email_already_exists", message: "Este e-mail já está cadastrado." });
        for (const acesso of destinos) {
          const autenticada = await fetch(`${acesso.base.replace(/\/$/, "")}/auth/login`, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, senha }), signal: AbortSignal.timeout(10_000),
          });
          assert.equal(autenticada.status, 200);
          const { token } = await autenticada.json() as LoginAutenticado;
          assert.equal(decodeJwt(token).sub, criada.id);
        }
      }

      const email = `concorrencia-${randomUUID()}@example.com`;
      const dados = { nome: "Conta Concorrente", email, senha: "SenhaTeste123!" };
      const respostas = await Promise.all([cadastrar(dados), cadastrar(dados)]);
      const corpos = await Promise.all(respostas.map(resposta => resposta.json() as Promise<{ id?: string; error?: string }>));
      for (const corpo of corpos) if (corpo.id) ids.push(corpo.id);
      assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [201, 409]);
      assert.equal(corpos.find(corpo => corpo.error)?.error, "email_already_exists");
      const quantidade = await consultar<{ quantidade: string }>(
        "SELECT COUNT(*)::text AS quantidade FROM usuarios WHERE email = $1", [email],
      );
      assert.equal(quantidade.rows[0].quantidade, "1");

      const emailInvalido = `invalido-${randomUUID()}@example.com`;
      const invalida = await cadastrar({ nome: "Inválida", email: emailInvalido, senha: "curta" });
      assert.equal(invalida.status, 400);
      await invalida.json();
      const inexistente = await consultar("SELECT id FROM usuarios WHERE email = $1", [emailInvalido]);
      assert.equal(inexistente.rows.length, 0);
    });
  }
});
