import { consultar } from "../../db/connection.ts";

/* Não confundir com o `Servico` de integrations/metrics-api.ts, que é o formato da API externa. */
export interface Servico {
  id: number;
  nome: string;
  status: "ativo" | "indisponivel" | "removido";
  cidade: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ServicoParaSalvar {
  idExterno: string;
  nome: string;
  aplicacaoId: number;
  regiaoId: number;
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

// O pg devolve BIGINT e NUMERIC como texto; os casts ::int e ::float8 trazem como number.
export async function listarServicos(): Promise<Servico[]> {
  const resultado = await consultar<Servico>(
    `SELECT id::int, nome, status, cidade, latitude::float8, longitude::float8
     FROM servicos
     ORDER BY id`,
  );
  return resultado.rows;
}

// Upsert pelo id da API: o serviço que já existe é atualizado em vez de duplicado.
// O status não muda aqui; quem marca removido ou ativo de novo é a detecção (TP11).
export async function salvarServico(servico: ServicoParaSalvar): Promise<Servico> {
  const resultado = await consultar<Servico>(
    `INSERT INTO servicos (id_externo, nome, aplicacao_id, regiao_id, cidade, latitude, longitude)
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
  return resultado.rows[0];
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
