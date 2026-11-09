import { consultar } from "../../db/connection.ts";

/* Não confundir com o `Servico` de integrations/metrics-api.ts, que é o formato da API externa. */
export interface Servico {
  id: number;
  nome: string;
  status: "ativo" | "indisponivel" | "removido";
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Vêm da região; nulos quando o serviço não tem localização. */
  pais?: string | null;
  regiao?: string | null;
}

/** Serviço com a localização e a última coleta, que é o que o dashboard mostra (RF02, RF05, RF06). */
export interface ServicoComUltimaColeta extends Servico {
  regiao: string | null;
  pais: string | null;
  /** Null quando o serviço ainda não teve nenhuma coleta (o dashboard mostra "sem métricas"). */
  coletadoEm: Date | null;
  statusColeta: "sucesso" | "sem_metricas" | "indisponivel" | null;
  cpuPercentual: number | null;
  memoriaGb: number | null;
  discoGb: number | null;
  redeGb: number | null;
  energiaKwh: number | null;
  emissaoCo2eG: number | null;
}

export interface ServicoParaSalvar {
  idExterno: string;
  nome: string;
  aplicacaoId: number;
  regiaoId: number | null;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RegiaoParaSalvar {
  nome: string;
  pais: string;
  fatorCo2eGKwh: number;
  anoReferencia: number;
  fonte: string | null;
}

export async function buscarAplicacaoId(nome: string): Promise<number> {
  const resultado = await consultar<{ id: number }>(
    "SELECT id::int FROM aplicacoes WHERE nome = $1",
    [nome],
  );
  const aplicacao = resultado.rows[0];
  if (!aplicacao) {
    throw new Error(`Aplicação "${nome}" não encontrada no banco de dados`);
  }
  return aplicacao.id;
}

/** Usa as regiões configuradas no banco, sem alterar seus fatores de emissão. */
export async function buscarRegiaoId(nome: string, pais: string): Promise<number> {
  const resultado = await consultar<{ id: number }>(
    "SELECT id::int FROM regioes WHERE nome = $1 AND pais = $2",
    [nome, pais],
  );
  const regiao = resultado.rows[0];
  if (!regiao) {
    throw new Error(`Região "${nome}" de "${pais}" não cadastrada no banco de dados`);
  }
  return regiao.id;
}

// O pg devolve BIGINT e NUMERIC como texto; os casts ::int e ::float8 trazem como number.
// A última coleta de cada serviço vem do LATERAL; o LEFT JOIN mantém quem ainda não foi coletado.
export async function listarServicos(): Promise<ServicoComUltimaColeta[]> {
  const resultado = await consultar<ServicoComUltimaColeta>(
    `SELECT s.id::int, s.nome, s.status, s.cidade,
            s.latitude::float8, s.longitude::float8,
            r.nome AS regiao, r.pais,
            m.coletado_em AS "coletadoEm",
            m.status_coleta AS "statusColeta",
            m.cpu_percentual::float8 AS "cpuPercentual",
            m.memoria_gb::float8 AS "memoriaGb",
            m.disco_gb::float8 AS "discoGb",
            m.rede_gb::float8 AS "redeGb",
            m.energia_kwh::float8 AS "energiaKwh",
            m.emissao_co2e_g::float8 AS "emissaoCo2eG"
     FROM servicos s
     LEFT JOIN regioes r ON r.id = s.regiao_id
     LEFT JOIN LATERAL (
       SELECT * FROM metricas_servico
       WHERE servico_id = s.id
       ORDER BY coletado_em DESC, id DESC
       LIMIT 1
     ) m ON TRUE
     ORDER BY s.id`,
  );
  return resultado.rows;
}

export async function listarServicosSimples(): Promise<Servico[]> {
  const resultado = await consultar<Servico>(
    `SELECT s.id::int, s.nome, s.status, s.cidade, s.latitude::float8, s.longitude::float8,
            r.pais, r.nome AS regiao
     FROM servicos s
     LEFT JOIN regioes r ON r.id = s.regiao_id
     ORDER BY s.id`,
  );
  return resultado.rows;
}

export async function buscarServicoPorId(id: number): Promise<Servico | null> {
  const resultado = await consultar<Servico>(
    `SELECT id::int, nome, status, cidade, latitude::float8, longitude::float8
     FROM servicos
     WHERE id = $1`,
    [id],
  );
  return resultado.rows[0] ?? null;
}

// Upsert pelo id da API: o serviço que já existe é atualizado em vez de duplicado.
// O status não muda aqui; quem marca removido ou ativo de novo é a detecção (TP11).
export async function salvarServico(servico: ServicoParaSalvar, registrarInclusao = false): Promise<Servico> {
  const resultado = await consultar<Servico>(
    registrarInclusao ? `WITH inserido AS (
       INSERT INTO servicos (id_externo, nome, aplicacao_id, regiao_id, cidade, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id_externo) DO NOTHING
       RETURNING *
     ), atualizado AS (
       UPDATE servicos SET nome = $2, regiao_id = $4, cidade = $5, latitude = $6, longitude = $7
       WHERE id_externo = $1 AND aplicacao_id = $3 AND NOT EXISTS (SELECT 1 FROM inserido)
       RETURNING *
     ), evento AS (
       INSERT INTO logs_sistema (acao, detalhes)
       SELECT 'servico_incluido', jsonb_build_object(
         'servicoId', id, 'idExterno', id_externo, 'aplicacaoId', aplicacao_id,
         'statusAnterior', NULL, 'statusNovo', status, 'origem', 'metrics_api'
       ) FROM inserido
     )
     SELECT id::int, nome, status, cidade, latitude::float8, longitude::float8 FROM inserido
     UNION ALL
     SELECT id::int, nome, status, cidade, latitude::float8, longitude::float8 FROM atualizado`
    : `INSERT INTO servicos (id_externo, nome, aplicacao_id, regiao_id, cidade, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id_externo) DO UPDATE SET
       nome = EXCLUDED.nome,
       regiao_id = EXCLUDED.regiao_id,
       cidade = EXCLUDED.cidade,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude
     RETURNING id::int, nome, status, cidade, latitude::float8, longitude::float8`,
    [
      servico.idExterno,
      servico.nome,
      servico.aplicacaoId,
      servico.regiaoId,
      servico.cidade,
      servico.latitude,
      servico.longitude,
    ],
  );
  if (!resultado.rows[0]) throw new Error("Não foi possível salvar o serviço na aplicação monitorada");
  return resultado.rows[0];
}

export async function sincronizarPresencaServicos(aplicacaoId: number, idsExternos: string[]): Promise<void> {
  const resultado = await consultar<{ aplicacaoId: number }>(
    `WITH anteriores AS MATERIALIZED (
       SELECT id, id_externo, aplicacao_id, status FROM servicos
       WHERE (aplicacao_id = $1 AND id_externo IS NOT NULL) OR id_externo = ANY($2::varchar[])
       ORDER BY id FOR UPDATE
     ), alterados AS (
       UPDATE servicos s
       SET status = CASE WHEN a.id_externo = ANY($2::varchar[]) THEN 'ativo' ELSE 'removido' END
       FROM anteriores a
       WHERE s.id = a.id AND a.aplicacao_id = $1
         AND NOT EXISTS (SELECT 1 FROM anteriores WHERE aplicacao_id <> $1)
         AND ((a.id_externo = ANY($2::varchar[]) AND a.status = 'removido')
           OR (NOT (a.id_externo = ANY($2::varchar[])) AND a.status <> 'removido'))
       RETURNING s.id, s.id_externo, s.aplicacao_id, a.status AS status_anterior, s.status
     ), eventos AS (
       INSERT INTO logs_sistema (acao, detalhes)
       SELECT CASE WHEN status = 'removido' THEN 'servico_removido' ELSE 'servico_reativado' END,
         jsonb_build_object(
           'servicoId', id, 'idExterno', id_externo, 'aplicacaoId', aplicacao_id,
           'statusAnterior', status_anterior, 'statusNovo', status, 'origem', 'metrics_api'
         ) FROM alterados
     )
     SELECT aplicacao_id::int AS "aplicacaoId" FROM anteriores`,
    [aplicacaoId, idsExternos],
  );
  if (resultado.rows.some((servico) => servico.aplicacaoId !== aplicacaoId)) {
    throw new Error("Identificador externo pertence a outra aplicação");
  }
}

// Upsert por (nome, país), que já é UNIQUE no schema. Devolve o id para o salvarServico.
export async function salvarRegiao(regiao: RegiaoParaSalvar): Promise<number> {
  const resultado = await consultar<{ id: number }>(
    `INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia, fonte)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (nome, pais) DO UPDATE SET
       fator_co2e_g_kwh = EXCLUDED.fator_co2e_g_kwh,
       ano_referencia = EXCLUDED.ano_referencia,
       fonte = EXCLUDED.fonte
     RETURNING id::int`,
    [regiao.nome, regiao.pais, regiao.fatorCo2eGKwh, regiao.anoReferencia, regiao.fonte],
  );
  return resultado.rows[0].id;
}
