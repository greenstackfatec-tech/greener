-- TP07 / #92: atualização de volumes existentes, sem executar schema.sql ou seed.sql.
-- IDs confirmados em https://metrics.unilaunch.org/services e /services/{id}.
-- Execute com psql -v ON_ERROR_STOP=1. Em caso de erro, toda a migração é desfeita.
BEGIN;

ALTER TABLE servicos ADD COLUMN IF NOT EXISTS id_externo VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS servicos_id_externo_key ON servicos (id_externo);

-- Bloqueia gravações concorrentes enquanto valida e vincula o seed conhecido.
LOCK TABLE servicos IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
    m RECORD;
    legado RECORD;
    quantidade INTEGER;
BEGIN
    FOR m IN
        SELECT * FROM (VALUES
            ('billing-api',       'Billing API',       'Sudeste',  'Brazil',        'Sao Paulo', -23.5505, -46.6333),
            ('checkout-worker',   'Checkout Worker',   'Virginia', 'United States', 'Ashburn',    39.0438, -77.4874),
            ('recommendation-ai', 'Recommendation AI', 'Leinster', 'Ireland',       'Dublin',     53.3498,  -6.2603),
            ('inventory-sync',    'Inventory Sync',    'Ontario',  'Canada',        'Toronto',    43.6532, -79.3832),
            ('audit-stream',      'Audit Stream',      'Tokyo',    'Japan',         'Tokyo',      35.6762, 139.6503),
            ('email-dispatcher',  'Email Dispatcher',  'Sudeste',  'Brazil',        'Sao Paulo', -23.5505, -46.6333),
            ('fraud-detector',    'Fraud Detector',    'Virginia', 'United States', 'Ashburn',    39.0438, -77.4874),
            ('reporting-batch',   'Reporting Batch',   'Ontario',  'Canada',        'Toronto',    43.6532, -79.3832)
        ) AS mapa (id_externo, nome, regiao, pais, cidade, latitude, longitude)
    LOOP
        SELECT COUNT(*)
        INTO quantidade
        FROM servicos s
        JOIN aplicacoes a ON a.id = s.aplicacao_id
        WHERE a.nome = 'GreenER Demo'
          AND s.nome = m.nome;

        IF quantidade > 1 THEN
            RAISE EXCEPTION 'Mapeamento ambíguo para "%": % registros em GreenER Demo. Revise os IDs e o histórico antes de migrar.',
                m.nome, quantidade;
        END IF;
        -- Não recria registros removidos deliberadamente do banco.
        IF quantidade = 0 THEN
            CONTINUE;
        END IF;

        SELECT s.*, r.nome AS regiao, r.pais
        INTO legado
        FROM servicos s
        JOIN aplicacoes a ON a.id = s.aplicacao_id
        JOIN regioes r ON r.id = s.regiao_id
        WHERE a.nome = 'GreenER Demo'
          AND s.nome = m.nome;

        IF legado.id_externo = m.id_externo THEN
            CONTINUE;
        END IF;

        IF legado.id_externo IS NOT NULL THEN
            RAISE EXCEPTION 'Serviço "%" já possui outro ID externo (%). Revise o mapeamento.',
                m.nome, legado.id_externo;
        END IF;
        IF EXISTS (SELECT 1 FROM servicos WHERE id_externo = m.id_externo) THEN
            RAISE EXCEPTION 'ID externo "%" já pertence a outro registro. Revise os IDs e o histórico antes de migrar.',
                m.id_externo;
        END IF;
        IF legado.regiao IS DISTINCT FROM m.regiao
           OR legado.pais IS DISTINCT FROM m.pais
           OR legado.cidade IS DISTINCT FROM m.cidade
           OR legado.latitude IS DISTINCT FROM m.latitude
           OR legado.longitude IS DISTINCT FROM m.longitude THEN
            RAISE EXCEPTION 'Localização do serviço legado "%" difere do seed conhecido. Confirme o ID externo manualmente.',
                m.nome;
        END IF;

        UPDATE servicos
        SET id_externo = m.id_externo
        WHERE id = legado.id;
    END LOOP;
END $$;

-- Permite persistir intervalo zero, aceito pelo contrato da API e pela calculadora.
ALTER TABLE metricas_servico DROP CONSTRAINT IF EXISTS metricas_servico_intervalo_segundos_check;
ALTER TABLE metricas_servico ADD CONSTRAINT metricas_servico_intervalo_segundos_check
    CHECK (intervalo_segundos >= 0);

COMMIT;
