-- TP15 / #82: serviço sem localização é gravado com região nula, sem quebrar a coleta.
-- Atualização de volumes existentes, sem executar schema.sql ou seed.sql.
-- Execute com psql -v ON_ERROR_STOP=1. Em caso de erro, toda a migração é desfeita.
BEGIN;

ALTER TABLE servicos ALTER COLUMN regiao_id DROP NOT NULL;

COMMIT;
