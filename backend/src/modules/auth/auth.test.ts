import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, request as requisicaoHttp } from "node:http";
import test from "node:test";
import type { TestContext } from "node:test";
import pg from "pg";
import { compare } from "bcryptjs";
import { decodeJwt, SignJWT } from "jose";
import type { JWTPayload } from "jose";
import { tratarRequisicao } from "../../app.ts";
import { responder } from "../../shared/http.ts";
import { gerarToken, lerConfiguracaoJwt, verificarToken } from "./jwt.ts";
import { exigirAutenticacao } from "./auth.middleware.ts";
import { ErroLimiteLogin, LimitadorLogin } from "./auth.limiter.ts";
import type { LoginAutenticado } from "./auth.service.ts";
import { rotinaColeta } from "../collections/collections.service.ts";

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
  let intervaloConfigurado = "45";
  let falharConfiguracao = false;
  const emailsExistentes = new Set([usuario.email, "limitada@greener.com"]);
  t.mock.method(pg.Pool.prototype, "query", async (sql: string, parametros: unknown[]) => {
    if (/FROM configuracoes\b/.test(sql)) {
      assert.deepEqual(parametros, ["intervalo_coleta_segundos"]);
      if (falharConfiguracao) throw new Error("Detalhe interno da consulta de configuração");
      return { rows: [{ valor: intervaloConfigurado }] };
    }
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
    assert.deepEqual(dadosConfiguracao, { intervaloColetaSegundos: 45 });
  });

  await t.test("configuração inválida ou banco indisponível não devolvem um intervalo fictício", async (t) => {
    const base = await iniciarServidor(t);
    const respostaLogin = await login(base);
    const { token } = await respostaLogin.json() as LoginAutenticado;
    const consultar = () => fetch(`${base}/monitoring-settings`, {
      headers: { authorization: `Bearer ${token}` },
    });
    try {
      for (const valor of ["0", "-1", "inválido", "1.5", "2147484"]) {
        intervaloConfigurado = valor;
        assert.equal((await consultar()).status, 500);
      }
      intervaloConfigurado = "45";
      falharConfiguracao = true;
      const resposta = await consultar();
      assert.equal(resposta.status, 500);
      assert.ok(!(await resposta.text()).includes("Detalhe interno"));
    } finally {
      intervaloConfigurado = "45";
      falharConfiguracao = false;
    }
    assert.deepEqual(await (await consultar()).json(), { intervaloColetaSegundos: 45 });
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
    assert.equal((await fetch(`${base}/services`)).status, 401);
    assert.equal((await fetch(`${base}/collections`)).status, 401);
  });

  await t.test("sem segredo, rotas públicas funcionam e a autenticação não libera acesso", async (t) => {
    const base = await iniciarServidor(t);
    const token = await gerarToken("1");
    const segredoAnterior = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      for (const caminho of ["/health/live", "/health/ready"]) {
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

test("rotas de coleta e dashboard recusam acesso sem autorização antes de executar ações", async (t) => {
  const base = await iniciarServidor(t);
  const consulta = t.mock.method(pg.Pool.prototype, "query", async () => {
    throw new Error("Uma requisição bloqueada não deve consultar o banco");
  });
  const fetchOriginal = globalThis.fetch;
  let externas = 0;
  t.mock.method(globalThis, "fetch", (...args: Parameters<typeof fetch>) => {
    if (!String(args[0]).startsWith(`${base}/`)) {
      externas++;
      throw new Error("Uma requisição bloqueada não deve consultar APIs externas");
    }
    return fetchOriginal(...args);
  });
  const estadoAnterior = rotinaColeta.status();
  const token = await gerarToken("1");
  const rotas = [
    ["POST", "/collections/executar"],
    ["POST", "/collections/rotina/iniciar"],
    ["POST", "/collections/rotina/parar"],
    ["GET", "/collections/rotina/status"],
    ["GET", "/collections"],
    ["GET", "/collections?serviceId=17"],
    ["GET", "/services"],
    ["GET", "/services/17"],
    ["GET", "/dashboard/indicadores"],
    ["GET", "/analytics/historico/17"],
    ["GET", "/analytics/ranking"],
    ["GET", "/analytics/comparacao"],
  ];
  for (const [method, caminho] of rotas) {
    await t.test(`${method} ${caminho}`, async () => {
      for (const authorization of [undefined, "Bearer invalido"]) {
        const resposta = await fetch(`${base}${caminho}`, {
          method,
          headers: authorization ? { authorization } : {},
          ...(method === "POST" ? { body: "{" } : {}),
        });
        assert.equal(resposta.status, 401);
        assert.deepEqual(await resposta.json(), { error: "unauthorized", message: "Token ausente ou inválido." });
        assert.equal(resposta.headers.get("cache-control"), "no-store");
        assert.equal(resposta.headers.get("www-authenticate"), authorization ? 'Bearer error="invalid_token"' : "Bearer");
      }
      const separador = caminho.includes("?") ? "&" : "?";
      const resposta = await fetch(`${base}${caminho}${separador}token=${token}`, { method });
      assert.equal(resposta.status, 401);
    });
  }
  assert.equal(consulta.mock.calls.length, 0);
  assert.equal(externas, 0);
  assert.deepEqual(rotinaColeta.status(), estadoAnterior);
});

test("cadastro público persiste bcrypt e permite login sem alterar contas existentes", async (t) => {
  const contas = new Map<string, { id: string; nome: string; senha_hash: string }>();
  let consultas = 0;
  let falha: unknown;
  t.mock.method(pg.Pool.prototype, "query", async (sql: string, parametros: unknown[]) => {
    consultas += 1;
    if (falha !== undefined) throw falha;
    if (/INSERT INTO usuarios\b/.test(sql)) {
      assert.match(sql, /VALUES \(\$1, \$2, \$3\) RETURNING id::text$/);
      assert.equal(parametros.length, 3);
      const [nome, email, senha_hash] = parametros as string[];
      if (contas.has(email)) throw { code: "23505", constraint: "usuarios_email_key" };
      const id = String(9007199254740993n + BigInt(contas.size));
      contas.set(email, { id, nome, senha_hash });
      return { rows: [{ id }] };
    }
    assert.match(sql, /FROM usuarios WHERE email = \$1$/);
    return { rows: contas.has(parametros[0] as string) ? [contas.get(parametros[0] as string)] : [] };
  });
  const base = await iniciarServidor(t);
  const cadastrar = (dados: unknown) => fetch(`${base}/auth/register`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dados),
  });

  await t.test("aceita o corpo mínimo e os campos adicionais da tela sem armazená-los", async () => {
    const casos = [
      { nome: "Pessoa Teste", email: "nova@example.com", senha: "Senha123" },
      { nome: "  Pessoa Física  ", email: "  fisica@example.com  ", senha: " Senha123 ", tipoPessoa: "fisica", documento: "52998224725" },
      { nome: "Empresa Teste", email: "empresa@example.com", senha: "Senha123", tipoPessoa: "juridica", documento: "11222333000181" },
      { nome: "Limite", email: "limite-ascii@example.com", senha: "a".repeat(72) },
      { nome: "Unicode", email: "limite-utf8@example.com", senha: "á".repeat(36) },
      { nome: "O'Hara", email: "o'hara@example.com", senha: "Senha123", tipoPessoa: "outro", documento: null },
    ];
    for (const dados of casos) {
      const resposta = await cadastrar(dados);
      assert.equal(resposta.status, 201);
      assert.equal(resposta.headers.get("cache-control"), "no-store");
      assert.match(resposta.headers.get("content-type") ?? "", /application\/json/);
      const conta = contas.get(dados.email.trim());
      assert.ok(conta);
      assert.deepEqual(await resposta.json(), { id: conta.id });
      assert.equal(conta.nome, dados.nome.trim());
      assert.deepEqual(Object.keys(conta).sort(), ["id", "nome", "senha_hash"]);
      assert.match(conta.senha_hash, /^\$2[aby]\$10\$/);
      assert.notEqual(conta.senha_hash, dados.senha);
      assert.equal(await compare(dados.senha, conta.senha_hash), true);
      const autenticada = await login(base, { email: dados.email, senha: dados.senha });
      assert.equal(autenticada.status, 200);
      const { token } = await autenticada.json() as LoginAutenticado;
      assert.equal(await verificarToken(token), conta.id);
    }
  });

  await t.test("duplicidade de e-mail retorna conflito sem sobrescrever a senha", async () => {
    const antes = { ...contas.get("nova@example.com") };
    const resposta = await cadastrar({ nome: "Outra Pessoa", email: " nova@example.com ", senha: "OutraSenha123" });
    assert.equal(resposta.status, 409);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    assert.deepEqual(await resposta.json(), { error: "email_already_exists", message: "Este e-mail já está cadastrado." });
    assert.deepEqual(contas.get("nova@example.com"), antes);
    assert.equal((await login(base, { email: "nova@example.com", senha: "Senha123" })).status, 200);
    assert.equal((await login(base, { email: "nova@example.com", senha: "OutraSenha123" })).status, 401);
  });

  await t.test("requisições simultâneas com mesmo e-mail criam somente uma conta", async () => {
    const antes = contas.size;
    const dados = { nome: "Concorrência", email: "simultaneo@example.com", senha: "Senha123" };
    const respostas = await Promise.all([cadastrar(dados), cadastrar(dados)]);
    assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [201, 409]);
    await Promise.all(respostas.map(resposta => resposta.json()));
    assert.equal(contas.size, antes + 1);
  });

  await t.test("rejeita dados inválidos antes de acessar o banco", async () => {
    const valido = { nome: "Pessoa Teste", email: "valida@example.com", senha: "Senha123" };
    const casos: unknown[] = [null, [], "texto", 123, {}];
    for (const nome of [undefined, null, 123, "", "   ", "a".repeat(101), "Pessoa\0Teste"]) casos.push({ ...valido, nome });
    for (const email of [undefined, null, 123, "", "invalido", "a\0@exemplo.com", `${"a".repeat(145)}@exemplo.com`]) casos.push({ ...valido, email });
    for (const senha of [undefined, null, 123, "", "1234567", "a".repeat(73), "á".repeat(37), "Senha123\0"]) casos.push({ ...valido, senha });
    const antes = consultas;
    for (const dados of casos) {
      const resposta = await cadastrar(dados);
      assert.equal(resposta.status, 400);
      assert.equal((await resposta.json() as { error: string }).error, "invalid_request");
    }
    assert.equal(consultas, antes);
  });

  await t.test("mantém os erros de JSON, tipo de conteúdo e tamanho do corpo", async () => {
    const antes = consultas;
    const casos = [
      { body: "{", tipo: "application/json", status: 400, codigo: "invalid_json" },
      { body: "", tipo: "application/json", status: 400, codigo: "invalid_json" },
      { body: "texto", tipo: "text/plain", status: 415, codigo: "unsupported_media_type" },
      { body: "a".repeat(8193), tipo: "application/json", status: 413, codigo: "payload_too_large" },
    ];
    for (const caso of casos) {
      const resposta = await fetch(`${base}/auth/register`, {
        method: "POST", headers: { "content-type": caso.tipo }, body: caso.body,
      });
      assert.equal(resposta.status, caso.status);
      assert.equal((await resposta.json() as { error: string }).error, caso.codigo);
      assert.equal(resposta.headers.get("cache-control"), "no-store");
    }
    assert.equal(consultas, antes);
  });

  await t.test("falhas inesperadas do banco não são confundidas com e-mail duplicado", async () => {
    try {
      for (const erro of [new Error("Detalhe interno"), { code: "23505", constraint: "usuarios_pkey" }, { code: "23503" }, null]) {
        falha = erro;
        const resposta = await cadastrar({ nome: "Falha", email: "falha@example.com", senha: "Senha123" });
        assert.equal(resposta.status, 500);
        assert.deepEqual(await resposta.json(), { error: "internal_server_error" });
      }
    } finally {
      falha = undefined;
    }
    assert.equal(contas.has("falha@example.com"), false);
  });

  await t.test("cadastro público funciona também sem segredo JWT configurado", async () => {
    const segredo = process.env.JWT_SECRET;
    try {
      delete process.env.JWT_SECRET;
      const resposta = await cadastrar({ nome: "Pública", email: "publica@example.com", senha: "Senha123" });
      assert.equal(resposta.status, 201);
      await resposta.json();
    } finally {
      if (segredo === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = segredo;
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
  const base = await iniciarServidor(t, (request, response) => protegido(request, response, {}));
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
