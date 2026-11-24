import { consultar } from "../../db/connection.ts";
import type { RankingItem, RankingParams } from "./analytics.repository.ts";

export type AgregacaoRanking = "total" | "media";

export interface RankingDetalhadoItem extends Omit<RankingItem,
  "totalEnergiaKwh" | "totalEmissaoCo2eG" | "mediaEnergiaKwh" | "mediaEmissaoCo2eG"> {
  aplicacao: string;
  totalEnergiaKwh: number | null;
  totalEmissaoCo2eG: number | null;
  mediaEnergiaKwh: number | null;
  mediaEmissaoCo2eG: number | null;
  tendenciaPercentual: number | null;
}

export interface RankingDetalhado {
  dados: RankingDetalhadoItem[];
  aplicacoes: { id: number; nome: string }[];
  resumo: {
    classificados: number;
    semDados: number;
    mediaEnergiaKwh: number | null;
    mediaEmissaoCo2eG: number | null;
    menorEnergia: { nome: string; mediaEnergiaKwh: number } | null;
    primeiroColocado: RankingDetalhadoItem | null;
  };
}

export async function buscarRankingDetalhado({
  inicio,
  fim,
  metrica,
  agregacao,
  ordenacao = "DESC",
  limite = 20,
  offset = 0,
  aplicacaoId,
  regiaoId,
  apenasAtivos = true,
}: RankingParams & { agregacao: AgregacaoRanking }): Promise<RankingDetalhado> {
  const coluna = metrica === "energia" ? "energia_kwh" : "emissao_co2e_g";
  const operacao = agregacao === "media" ? "AVG" : "SUM";
  const prefixo = agregacao === "media" ? "media" : "total";
  const valorAtual = `${prefixo}_${coluna}`;
  const direcao = ordenacao === "ASC" ? "ASC" : "DESC";

  const resultado = await consultar<RankingDetalhado>(`
    WITH catalogo AS (
      SELECT s.id, s.nome, a.id AS aplicacao_id, a.nome AS aplicacao, r.nome AS regiao, r.pais
      FROM servicos s
      JOIN aplicacoes a ON a.id = s.aplicacao_id
      LEFT JOIN regioes r ON r.id = s.regiao_id
      WHERE (NOT $3::boolean OR s.status = 'ativo')
        AND ($4::bigint IS NULL OR s.regiao_id = $4)
    ), escopo AS (
      SELECT * FROM catalogo WHERE $5::bigint IS NULL OR aplicacao_id = $5
    ), agregado AS (
      SELECT s.id AS servico_id,
        SUM(m.energia_kwh) FILTER (WHERE m.coletado_em >= $1) AS total_energia_kwh,
        SUM(m.emissao_co2e_g) FILTER (WHERE m.coletado_em >= $1) AS total_emissao_co2e_g,
        AVG(m.energia_kwh) FILTER (WHERE m.coletado_em >= $1) AS media_energia_kwh,
        AVG(m.emissao_co2e_g) FILTER (WHERE m.coletado_em >= $1) AS media_emissao_co2e_g,
        COUNT(m.${coluna}) FILTER (WHERE m.coletado_em >= $1) AS qtd_coletas,
        ${operacao}(m.${coluna}) FILTER (WHERE m.coletado_em < $1) AS valor_anterior
      FROM escopo s
      LEFT JOIN metricas_servico m ON m.servico_id = s.id
        AND m.status_coleta = 'sucesso'
        AND m.coletado_em BETWEEN
          $1::timestamptz - (EXTRACT(EPOCH FROM ($2::timestamptz - $1::timestamptz)) * INTERVAL '1 second')
          AND $2::timestamptz
      GROUP BY s.id
    ), classificados AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY ${valorAtual} ${direcao}, servico_id) AS posicao,
        100 * (${valorAtual} - valor_anterior) / NULLIF(valor_anterior, 0) AS tendencia
      FROM agregado
      WHERE ${valorAtual} IS NOT NULL
    ), itens AS (
      SELECT c.posicao, s.id AS "servicoId", s.nome, s.aplicacao, s.regiao, s.pais,
        c.total_energia_kwh AS "totalEnergiaKwh", c.total_emissao_co2e_g AS "totalEmissaoCo2eG",
        c.media_energia_kwh AS "mediaEnergiaKwh", c.media_emissao_co2e_g AS "mediaEmissaoCo2eG",
        c.qtd_coletas AS "qtdColetas", c.tendencia AS "tendenciaPercentual"
      FROM classificados c
      JOIN escopo s ON s.id = c.servico_id
    )
    SELECT
      COALESCE((
        SELECT jsonb_agg(to_jsonb(pagina) - 'posicao' ORDER BY pagina.posicao)
        FROM (SELECT * FROM itens ORDER BY posicao LIMIT $6 OFFSET $7) pagina
      ), '[]'::jsonb) AS dados,
      COALESCE((
        SELECT json_agg(projeto ORDER BY projeto.nome, projeto.id)
        FROM (SELECT DISTINCT aplicacao_id AS id, aplicacao AS nome FROM catalogo) projeto
      ), '[]'::json) AS aplicacoes,
      (
        SELECT json_build_object(
          'classificados', COUNT(*),
          'semDados', (SELECT COUNT(*) FROM escopo) - COUNT(*),
          'mediaEnergiaKwh', AVG(media_energia_kwh),
          'mediaEmissaoCo2eG', AVG(media_emissao_co2e_g),
          'menorEnergia', (
            SELECT json_build_object('nome', nome, 'mediaEnergiaKwh', "mediaEnergiaKwh")
            FROM itens
            WHERE "mediaEnergiaKwh" IS NOT NULL
            ORDER BY "mediaEnergiaKwh", "servicoId"
            LIMIT 1
          ),
          'primeiroColocado', (SELECT to_jsonb(itens) - 'posicao' FROM itens WHERE posicao = 1)
        )
        FROM classificados
      ) AS resumo
  `, [inicio, fim, apenasAtivos, regiaoId, aplicacaoId, limite, offset]);

  return resultado.rows[0];
}
