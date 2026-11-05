import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, request as requisicaoHttp } from "node:http";
import test from "node:test";
import type { TestContext } from "node:test";
import pg from "pg";
import { decodeJwt, SignJWT } from "jose";
import type { JWTPayload } from "jose";
import { tratarRequisicao } from "../../app.ts";
import { responder } from "../../shared/http.ts";
import { gerarToken, lerConfiguracaoJwt, verificarToken } from "./jwt.ts";
import { exigirAutenticacao } from "./auth.middleware.ts";
import { ErroLimiteLogin, LimitadorLogin } from "./auth.limiter.ts";
import type { LoginAutenticado } from "./auth.service.ts";

process.env.JWT_SECRET = randomBytes(48).toString("base64url");

const seed = await readFile(new URL("../../../../database/seed.sql", import.meta.url), "utf8");
const hashSeed = seed.match(/'teste@greener\.com',\s*'(\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53})'/)?.[1];
assert.ok(hashSeed, "O seed precisa conter o hash bcrypt do usuário de teste.");
const usuario = { id: "1", email: "teste@greener.com", senha_hash: hashSeed };

async function iniciarServidor(t: TestContext, tratar = tratarRequisicao): Promise<string> {
  const servidor = createServer((request, response) => {
    void tratar(request, response).catch(() => {
      responder(response, 500, { error: "internal_server_error" });
    });
  });
  t.after(() => {
    servidor.close();
    servidor.closeAllConnections();
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  assert.ok(endereco && typeof endereco !== "string");
  return `http://127.0.0.1:${endereco.port}`;
}

function login(base: string, dados: unknown = { email: usuario.email, senha: "greener123" }): Promise<Response> {
  return fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dados),
  });
}

async function assinar(payload: JWTPayload, algoritmo = "HS256", chave = lerConfiguracaoJwt().chave): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: algoritmo, typ: "JWT" }).sign(chave);
}

test("login e proteção HTTP passam pelas camadas reais, simulando só a consulta ao banco", async (t) => {
  let consultas = 0;
  let falharConsulta = false;
  const emailsExistentes = new Set([usuario.email, "limitada@greener.com"]);
  t.mock.method(pg.Pool.prototype, "query", async (sql: string, parametros: unknown[]) => {
    if (!/FROM usuarios\b/.test(sql)) return { rows: [] };
    consultas += 1;
    assert.match(sql, /WHERE email = \$1$/);
    assert.equal(parametros.length, 1);
    if (falharConsulta) throw new Error("Detalhe interno que não pode aparecer na resposta");
    return { rows: emailsExistentes.has(parametros[0] as string) ? [usuario] : [] };
  });

  await t.test("senha do seed gera JWT e abre a configuração", async (t) => {
    const base = await iniciarServidor(t);
    const resposta = await login(base);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    const dados = await resposta.json() as LoginAutenticado;
    assert.deepEqual(Object.keys(dados), ["token"]);
    assert.equal(typeof dados.token, "string");
    assert.ok(!JSON.stringify(dados).includes("senha"));
    assert.ok(!JSON.stringify(dados).includes("greener123"));
    const payload = decodeJwt(dados.token);
    assert.equal(payload.sub, "1");
    assert.equal(payload.iss, "greener-backend");
    assert.equal(payload.aud, "greener");
    assert.equal(payload.exp! - payload.iat!, 3600);
    assert.ok(!("email" in payload) && !("senha" in payload) && !("senha_hash" in payload));

    const configuracao = await fetch(`${base}/monitoring-settings`, {
      headers: { authorization: `Bearer ${dados.token}` },
    });
    assert.equal(configuracao.status, 200);
    assert.equal(configuracao.headers.get("cache-control"), "no-store");
    const dadosConfiguracao = await configuracao.json() as { intervaloColetaSegundos: unknown };
    assert.ok(typeof dadosConfiguracao.intervaloColetaSegundos === "number"
      && Number.isSafeInteger(dadosConfiguracao.intervaloColetaSegundos)
      && dadosConfiguracao.intervaloColetaSegundos > 0);
  });

  await t.test("senha errada e usuário inexistente têm a mesma resposta e não recebem token", async (t) => {
    const base = await iniciarServidor(t);
    const senhaErrada = await login(base, { email: usuario.email, senha: "senha-incorreta" });
    const inexistente = await login(base, { email: "nao-existe@greener.com", senha: "greener123" });
    assert.equal(senhaErrada.status, 401);
    assert.equal(inexistente.status, 401);
    assert.deepEqual(await senhaErrada.json(), await inexistente.json());
  });

  await t.test("remove espaços do e-mail e preserva a senha exatamente como digitada", async (t) => {
    const base = await iniciarServidor(t);
    const emailComEspacos = await login(base, { email: ` ${usuario.email} `, senha: "greener123" });
    assert.equal(emailComEspacos.status, 200);
    const senhaComEspacos = await login(base, { email: usuario.email, senha: " greener123 " });
    assert.equal(senhaComEspacos.status, 401);
  });

  await t.test("rejeita corpos e campos inválidos antes de consultar o banco", async (t) => {
    const casos = [
      null, [], "texto", {}, { email: usuario.email },
      { email: 123, senha: "abc" }, { email: usuario.email, senha: 123 },
      { email: "invalido", senha: "abc" }, { email: usuario.email, senha: "" },
      { email: usuario.email, senha: "a".repeat(73) },
      { email: usuario.email, senha: "á".repeat(37) },
      { email: usuario.email, senha: "abc\0def" },
      { email: `${"a".repeat(145)}@greener.com`, senha: "abc" },
    ];
    for (const dados of casos) {
      const base = await iniciarServidor(t);
      const antes = consultas;
      const resposta = await login(base, dados);
      assert.equal(resposta.status, 400, JSON.stringify(dados));
      assert.equal(consultas, antes);
    }
  });

  await t.test("JSON malformado, corpo vazio, formato e tamanho indevidos têm erros explícitos", async (t) => {
    const base = await iniciarServidor(t);
    const antes = consultas;
    for (const body of ["{", ""]) {
      const resposta = await fetch(`${base}/auth/login`, {
        method: "POST", headers: { "content-type": "application/json" }, body,
      });
      assert.equal(resposta.status, 400);
      assert.equal((await resposta.json() as { error: string }).error, "invalid_json");
    }
    const tipoErrado = await fetch(`${base}/auth/login`, { method: "POST", body: "texto" });
    assert.equal(tipoErrado.status, 415);
    const muitoGrande = await fetch(`${base}/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "a".repeat(8193),
    });
    assert.equal(muitoGrande.status, 413);
    assert.equal(consultas, antes);
  });

  await t.test("limita também corpos enviados em chunks sem Content-Length", async (t) => {
    const base = await iniciarServidor(t);
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = requisicaoHttp(`${base}/auth/login`, {
        method: "POST", headers: { "content-type": "application/json", "transfer-encoding": "chunked" },
      }, (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      });
      req.on("error", reject);
      req.write("a".repeat(4096));
      req.end("b".repeat(4097));
    });
    assert.equal(status, 413);
  });

  await t.test("usa parâmetros SQL mesmo quando o e-mail contém caracteres de SQL", async (t) => {
    const base = await iniciarServidor(t);
    const resposta = await login(base, { email: "o'hara@greener.com", senha: "greener123" });
    assert.equal(resposta.status, 401);
  });

  await t.test("falha do banco não se transforma em credenciais inválidas nem vaza detalhes", async (t) => {
    const base = await iniciarServidor(t);
    falharConsulta = true;
    try {
      // Erros internos não devem consumir as cinco tentativas do usuário.
      for (let i = 0; i < 6; i += 1) {
        const resposta = await login(base);
        assert.equal(resposta.status, 500);
        assert.deepEqual(await resposta.json(), { error: "internal_server_error" });
      }
    } finally {
      falharConsulta = false;
    }
    assert.equal((await login(base)).status, 200);
  });

  await t.test("limita por e-mail sem revelar contas nem bloquear outros usuários do mesmo proxy", async (t) => {
    const base = await iniciarServidor(t);
    let erroBloqueio: unknown;
    for (const email of ["limitada@greener.com", "limite-inexistente@greener.com"]) {
      const antes = consultas;
      for (let i = 0; i < 5; i += 1) {
        const resposta = await fetch(`${base}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${i + 1}` },
          body: JSON.stringify({ email, senha: "senha-incorreta" }),
        });
        assert.equal(resposta.status, 401);
      }
      assert.equal(consultas - antes, 5);
      // Nem trocar o IP informado nem adicionar espaços ao e-mail contorna o limite.
      const bloqueada = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.1" },
        body: JSON.stringify({ email: ` ${email} `, senha: "greener123" }),
      });
      assert.equal(bloqueada.status, 429);
      assert.equal(bloqueada.headers.get("cache-control"), "no-store");
      const espera = Number(bloqueada.headers.get("retry-after"));
      assert.ok(Number.isInteger(espera) && espera > 0 && espera <= 300);
      const erro = await bloqueada.json();
      assert.deepEqual(erro, {
        error: "too_many_requests", message: "Muitas tentativas de login. Aguarde antes de tentar novamente.",
      });
      if (erroBloqueio) assert.deepEqual(erro, erroBloqueio);
      erroBloqueio = erro;
      assert.equal(consultas - antes, 5, "O bloqueio deve acontecer antes da consulta/bcrypt.");
    }
    assert.equal((await login(base)).status, 200);
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    assert.equal((await fetch(`${base}/monitoring-settings`)).status, 401);
  });

  await t.test("tentativas simultâneas não ultrapassam a cota de autenticação", async (t) => {
    const base = await iniciarServidor(t);
    const antes = consultas;
    const respostas = await Promise.all(Array.from({ length: 8 }, () => login(base, {
      email: "concorrencia@greener.com", senha: "senha-incorreta",
    })));
    assert.equal(respostas.filter((resposta) => resposta.status === 401).length, 5);
    assert.equal(respostas.filter((resposta) => resposta.status === 429).length, 3);
    assert.equal(consultas - antes, 5);
  });

  await t.test("token é obrigatório e não é aceito na URL", async (t) => {
    const base = await iniciarServidor(t);
    const token = await gerarToken("1");
    const resposta = await fetch(`${base}/monitoring-settings?token=${token}`);
    assert.equal(resposta.status, 401);
    assert.equal(resposta.headers.get("www-authenticate"), "Bearer");
    for (const authorization of ["Basic abc", "Bearer", "Bearer abc", `Bearer ${token} extra`]) {
      const invalida = await fetch(`${base}/monitoring-settings`, { headers: { authorization } });
      assert.equal(invalida.status, 401);
    }
    const publica = await fetch(`${base}/health/live`);
    assert.equal(publica.status, 200);
    assert.equal((await fetch(`${base}/services`)).status, 200);
    assert.equal((await fetch(`${base}/collections`)).status, 200);
  });

  await t.test("sem segredo, rotas públicas funcionam e a autenticação não libera acesso", async (t) => {
    const base = await iniciarServidor(t);
    const token = await gerarToken("1");
    const segredoAnterior = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      for (const caminho of ["/health/live", "/health/ready", "/services", "/collections"]) {
        assert.equal((await fetch(`${base}${caminho}`)).status, 200);
      }
      const resposta = await login(base);
      assert.equal(resposta.status, 500);
      assert.deepEqual(await resposta.json(), { error: "internal_server_error" });
      const protegida = await fetch(`${base}/monitoring-settings`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(protegida.status, 500);
      assert.deepEqual(await protegida.json(), { error: "internal_server_error" });
      assert.equal((await fetch(`${base}/monitoring-settings`)).status, 401);
    } finally {
      if (segredoAnterior === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = segredoAnterior;
    }
  });
});

test("rejeita JWT adulterado, expirado, com chave/algoritmo/claims incorretos", async (t) => {
  const base = await iniciarServidor(t);
  const agora = Math.floor(Date.now() / 1000);
  const valido: JWTPayload = {
    sub: "1", iss: "greener-backend", aud: "greener", iat: agora, exp: agora + 3600,
  };
  const token = await gerarToken("1");
  const partes = token.split(".");
  partes[1] = Buffer.from(JSON.stringify({ ...decodeJwt(token), sub: "2" })).toString("base64url");
  const semExp = { ...valido };
  delete semExp.exp;
  const semIat = { ...valido };
  delete semIat.iat;
  const casos = [
    partes.join("."),
    await assinar({ ...valido, iat: agora - 100, exp: agora - 1 }),
    await assinar(valido, "HS256", randomBytes(48)),
    await assinar(valido, "HS384"),
    await assinar({ ...valido, iss: "outro-backend" }),
    await assinar({ ...valido, aud: "outro-produto" }),
    await assinar({ ...valido, sub: "" }),
    await assinar({ ...valido, sub: "0" }),
    await assinar({ ...valido, iat: agora + 120 }),
    await assinar({ ...valido, iat: agora - 4000 }),
    await assinar({ ...valido, nbf: agora + 120 }),
    await assinar(semExp),
    await assinar(semIat),
    `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(valido)).toString("base64url")}.`,
  ];
  for (const tokenInvalido of casos) {
    const resposta = await fetch(`${base}/monitoring-settings`, {
      headers: { authorization: `Bearer ${tokenInvalido}` },
    });
    assert.equal(resposta.status, 401);
    assert.match(resposta.headers.get("www-authenticate") ?? "", /invalid_token/);
  }
  const idGrande = await gerarToken("9007199254740993");
  assert.equal(await verificarToken(idGrande), "9007199254740993");
});

test("a chave JWT precisa ser válida para emitir ou verificar tokens", () => {
  for (const JWT_SECRET of [undefined, "", "curto", " ".repeat(64)]) {
    assert.throws(() => lerConfiguracaoJwt({ JWT_SECRET }), /JWT_SECRET/);
  }
  assert.ok(lerConfiguracaoJwt().chave.byteLength >= 32);
});

test("limite de login libera acesso após a janela, sem prolongar o bloqueio", () => {
  let agora = 0;
  const limitador = new LimitadorLogin(() => agora);
  for (let i = 0; i < 5; i += 1) limitador.iniciarTentativa("conta@greener.com")("falha");
  const verificarEspera = (segundos: number) => {
    assert.throws(() => limitador.iniciarTentativa("conta@greener.com"), (erro: unknown) => {
      assert.ok(erro instanceof ErroLimiteLogin);
      assert.equal(erro.status, 429);
      assert.equal(erro.tentarNovamenteEmSegundos, segundos);
      return true;
    });
  };
  verificarEspera(300);
  agora = 299_001;
  verificarEspera(1);
  agora = 300_000;
  assert.doesNotThrow(() => limitador.iniciarTentativa("conta@greener.com")("sucesso"));
});

test("login válido zera as falhas anteriores e erros internos devolvem a reserva", () => {
  const limitador = new LimitadorLogin(() => 0);
  for (let rodada = 0; rodada < 2; rodada += 1) {
    for (let i = 0; i < 4; i += 1) limitador.iniciarTentativa("conta@greener.com")("falha");
    for (let i = 0; i < 6; i += 1) limitador.iniciarTentativa("conta@greener.com")("erro");
    limitador.iniciarTentativa("conta@greener.com")("sucesso");
  }
});

test("reserva protege a cota em paralelo e só pode ser concluída uma vez", () => {
  const limitador = new LimitadorLogin(() => 0);
  const pendentes = Array.from({ length: 5 }, () => limitador.iniciarTentativa("conta@greener.com"));
  assert.throws(() => limitador.iniciarTentativa("conta@greener.com"), ErroLimiteLogin);
  pendentes[0]!("erro");
  pendentes[0]!("erro");
  limitador.iniciarTentativa("conta@greener.com")("falha");
  assert.throws(() => limitador.iniciarTentativa("conta@greener.com"), ErroLimiteLogin);
});

test("concluir uma requisição antiga não remove o bloqueio da janela seguinte", () => {
  let agora = 0;
  const limitador = new LimitadorLogin(() => agora);
  const antiga = limitador.iniciarTentativa("conta@greener.com");
  agora = 300_000;
  for (let i = 0; i < 5; i += 1) limitador.iniciarTentativa("conta@greener.com")("falha");
  antiga("sucesso");
  assert.throws(() => limitador.iniciarTentativa("conta@greener.com"), ErroLimiteLogin);
});

test("memória é limitada sem descartar bloqueios ativos; entradas expiradas liberam espaço", () => {
  let agora = 0;
  const limitador = new LimitadorLogin(() => agora);
  for (let i = 0; i < 10_000; i += 1) limitador.iniciarTentativa(`conta-${i}@greener.com`)("falha");
  for (let i = 0; i < 4; i += 1) limitador.iniciarTentativa("conta-0@greener.com")("falha");
  assert.throws(() => limitador.iniciarTentativa("outra@greener.com"), ErroLimiteLogin);
  assert.throws(() => limitador.iniciarTentativa("conta-0@greener.com"), ErroLimiteLogin);
  agora = 300_000;
  assert.doesNotThrow(() => limitador.iniciarTentativa("outra@greener.com")("sucesso"));
  assert.doesNotThrow(() => limitador.iniciarTentativa("conta-0@greener.com")("sucesso"));
});

test("middleware protege também controllers de escrita antes de executar qualquer ação", async (t) => {
  let execucoes = 0;
  const protegido = exigirAutenticacao(async (_request, response) => {
    execucoes += 1;
    responder(response, 200, { autorizado: true });
  });
  const base = await iniciarServidor(t, protegido);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const resposta = await fetch(base, { method });
    assert.equal(resposta.status, 401);
    assert.equal(execucoes, 0);
  }
  const token = await gerarToken("1");
  const autorizada = await fetch(base, { method: "PATCH", headers: { authorization: `Bearer ${token}` } });
  assert.equal(autorizada.status, 200);
  assert.equal(execucoes, 1);
});
