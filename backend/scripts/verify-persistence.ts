import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { regioes } from "../src/mocks/fixtures.ts";
import type { ResultadoRodadaColeta } from "../src/modules/collections/collections.service.ts";

interface RespostaExecucaoColeta {
  dados: Pick<ResultadoRodadaColeta, "sucessos" | "erros" | "detalhes">;
}

interface ColetaBanco {
  servico_id: string;
  cpu_percentual: string | null;
  energia_kwh: string | null;
  calculado_em: Date | null;
}

// Projeto e volume exclusivos dos testes. Não usa o .env nem o banco principal.
const raiz = fileURLToPath(new URL("../../", import.meta.url));
const ambiente = {
  ...process.env,
  POSTGRES_PORT: "55492",
  BACKEND_PORT: "30492",
  FRONTEND_PORT: "18092",
  POSTGRES_DB: "greener",
  POSTGRES_USER: "greener",
  POSTGRES_PASSWORD: "greener_dev_only",
  JWT_SECRET: randomBytes(48).toString("base64url"),
};
const argumentosCompose = [
  "compose",
  "-p",
  "greener-tp07-check",
  "--env-file",
  ".env.example",
  "-f",
  "compose.yaml",
  "-f",
  "compose.persistence.yaml",
];
function executarComando(
  comando: string,
  argumentos: string[],
  opcoes: SpawnOptions,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const processo = spawn(comando, argumentos, {
      ...opcoes,
      stdio: "inherit",
    });
    processo.on("error", reject);
    processo.on("exit", (codigo) => {
      if (codigo === 0) {
        resolve();
      } else {
        reject(new Error(`${comando} terminou com código ${codigo}`));
      }
    });
  });
}

function compose(argumentos: string[]): Promise<void> {
  return executarComando("docker", [...argumentosCompose, ...argumentos], {
    cwd: raiz,
    env: ambiente,
  });
}

async function requisitar<T>(caminho: string, method = "GET"): Promise<T> {
  const resposta = await fetch(`http://127.0.0.1:30492${caminho}`, {
    method,
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(resposta.status, 200, await resposta.clone().text());
  return resposta.json() as Promise<T>;
}
function criarClienteBanco() {
  return new pg.Client({
    host: "127.0.0.1",
    port: 55492,
    database: "greener",
    user: "greener",
    password: "greener_dev_only",
    connectionTimeoutMillis: 5000,
    options: "",
  });
}
async function prepararRegioesMock() {
  const banco = criarClienteBanco();
  await banco.connect();
  try {
    for (const regiao of regioes) {
      await banco.query(
        `INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia, fonte)
         VALUES ($1, $2, $3, 2026, 'mock TP07')
         ON CONFLICT (nome, pais) DO UPDATE SET
           fator_co2e_g_kwh = EXCLUDED.fator_co2e_g_kwh,
           ano_referencia = EXCLUDED.ano_referencia, fonte = EXCLUDED.fonte`,
        [regiao.region, regiao.country, regiao.carbon_intensity_gco2e_per_kwh],
      );
    }
  } finally {
    await banco.end();
  }
}
async function consultarBanco() {
  const banco = criarClienteBanco();
  await banco.connect();
  try {
    return {
      servicos: (await banco.query<Record<string, unknown>>("SELECT * FROM servicos ORDER BY id"))
        .rows,
      coletas: (await banco.query<ColetaBanco>("SELECT * FROM metricas_servico ORDER BY id")).rows,
    };
  } finally {
    await banco.end();
  }
}
async function snapshot() {
  const banco = await consultarBanco();
  const servicos = await requisitar("/services");
  const coletas = await requisitar<{ id: number }[]>("/collections");
  return { banco, servicos, coletas: coletas.sort((a, b) => a.id - b.id) };
}

async function aguardarConexaoExterna() {
  // O healthcheck interno pode passar antes de a porta publicada voltar a aceitar conexões.
  const limite = Date.now() + 60_000;
  let ultimoErro;
  while (Date.now() < limite) {
    try {
      await consultarBanco();
      await requisitar("/health/ready");
      return;
    } catch (erro) {
      ultimoErro = erro;
      await setTimeout(1000);
    }
  }
  throw new Error("O banco/backend não ficaram acessíveis pela máquina host em 60 segundos", {
    cause: ultimoErro,
  });
}

try {
  await compose(["up", "-d", "--wait", "database"]);
  await compose([
    "cp",
    "database/migrations/001_persistencia_coletas.sql",
    "database:/tmp/tp07.sql",
  ]);
  await compose([
    "exec",
    "-T",
    "database",
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    "greener",
    "-d",
    "greener",
    "-f",
    "/tmp/tp07.sql",
  ]);
  await compose(["up", "-d", "--build", "--wait", "--wait-timeout", "120"]);
  await aguardarConexaoExterna();
  await prepararRegioesMock();
  const antes = await consultarBanco();
  const primeira = (await requisitar<RespostaExecucaoColeta>("/collections/executar", "POST"))
    .dados;
  const segunda = (await requisitar<RespostaExecucaoColeta>("/collections/executar", "POST")).dados;
  for (const rodada of [primeira, segunda]) {
    assert.equal(rodada.sucessos, 2);
    assert.equal(rodada.erros, 0);
  }
  assert.deepEqual(
    segunda.detalhes.map((s) => s.servicoId),
    primeira.detalhes.map((s) => s.servicoId),
  );
  const salvo = await snapshot();
  assert.equal(salvo.banco.coletas.length, antes.coletas.length + 4);
  for (const detalhe of primeira.detalhes) {
    const coletas = salvo.banco.coletas.filter((c) => c.servico_id === String(detalhe.servicoId));
    assert.ok(coletas.length >= 2);
    const ultima = coletas.at(-1)!;
    assert.equal(Number(ultima.cpu_percentual), 25);
    assert.ok(Number(ultima.energia_kwh) > 0);
    assert.ok(ultima.calculado_em instanceof Date);
  }

  await compose(["restart"]);
  await compose(["up", "-d", "--wait", "--wait-timeout", "120"]);
  await aguardarConexaoExterna();
  assert.deepEqual(await snapshot(), salvo);
  console.log("Persistência confirmada após reiniciar os contêineres.");

  await compose(["up", "-d", "--force-recreate", "--wait", "--wait-timeout", "120"]);
  await aguardarConexaoExterna();
  assert.deepEqual(await snapshot(), salvo);
  const terceira = (await requisitar<RespostaExecucaoColeta>("/collections/executar", "POST"))
    .dados;
  assert.equal(terceira.sucessos, 2);
  assert.deepEqual(
    terceira.detalhes.map((s) => s.servicoId),
    primeira.detalhes.map((s) => s.servicoId),
  );
  assert.equal((await consultarBanco()).coletas.length, salvo.banco.coletas.length + 2);
  console.log("Persistência confirmada após recriar os contêineres; nova coleta mantém os IDs.");

  await executarComando(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "src/modules/auth/auth.integration.test.ts",
      "src/modules/services/services.test.ts",
      "src/modules/services/services.repository.integration.test.ts",
      "src/modules/collections/collections.repository.integration.test.ts",
      "src/modules/collections/collections.integration.test.ts",
      "src/db/migrations.integration.test.ts",
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: {
        ...ambiente,
        PGHOST: "127.0.0.1",
        PGPORT: "55492",
        PGDATABASE: "greener",
        PGUSER: "greener",
        PGPASSWORD: "greener_dev_only",
        PGOPTIONS: "",
        PGCONNECT_TIMEOUT: "5",
        TEST_API_URL: "http://127.0.0.1:30492",
        TEST_PROXY_URL: "http://127.0.0.1:18092/api",
      },
    },
  );
} finally {
  // Mantém o volume para inspeção e futuras execuções, mas libera as portas.
  await compose(["stop"]);
}
