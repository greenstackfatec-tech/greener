import { consultar } from "../../db/connection.ts";

export interface Servico {
  id: number;
  nome: string;
  status: string;
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Vêm da região; nulos quando o serviço não tem localização. */
  pais?: string | null;
  regiao?: string | null;
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

export async function buscarAplicacaoId(nome: string): Promise<number> {
  const resultado = await consultar<{ id: number }>("SELECT id::int FROM aplicacoes WHERE nome = $1", [nome]);
  if (resultado.rows.length === 0) throw new Error(`Aplicação não encontrada: ${nome}`);
  return resultado.rows[0].id;
}

export async function buscarRegiaoId(nome: string, pais: string): Promise<number> {
  const resultado = await consultar<{ id: number }>("SELECT id::int FROM regioes WHERE nome = $1 AND pais = $2", [nome, pais]);
  if (resultado.rows.length === 0) throw new Error(`Região não encontrada: ${nome} (${pais})`);
  return resultado.rows[0].id;
}

// A última coleta de cada serviço vem do LATERAL; o LEFT JOIN mantém quem ainda não foi coletado.
export async function listarServicos(): Promise<Servico[]> {
  const resultado = await consultar<Servico>(
    `SELECT s.id::int, s.nome, s.status, s.cidade,
            s.latitude::float8, s.longitude::float8,
            r.nome AS regiao, r.pais
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
export async function salvarServico(servico: ServicoParaSalvar): Promise<Servico> {
  const resultado = await consultar<Servico>(
    `INSERT INTO servicos (id_externo, aplicacao_id, regiao_id, nome, cidade, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id_externo) DO UPDATE SET
       aplicacao_id = EXCLUDED.aplicacao_id,
       regiao_id = EXCLUDED.regiao_id,
       nome = EXCLUDED.nome,
       cidade = EXCLUDED.cidade,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude
     RETURNING id::int, nome, status, cidade, latitude::float8, longitude::float8,
               (SELECT pais FROM regioes WHERE id = EXCLUDED.regiao_id) AS pais,
               (SELECT nome FROM regioes WHERE id = EXCLUDED.regiao_id) AS regiao`,
    [servico.idExterno, servico.aplicacaoId, servico.regiaoId, servico.nome, servico.cidade, servico.latitude, servico.longitude],
  );
  return resultado.rows[0];
}

// Upsert de região por nome+pais (usado nos testes de integração)
export async function salvarRegiao(regiao: {
  nome: string;
  pais: string;
  fatorCo2eGKwh: number;
  anoReferencia: number;
  fonte: string;
}): Promise<number> {
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