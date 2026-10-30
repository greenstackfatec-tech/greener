-- =====================================================================
-- GreenER - seed.sql
-- Carrega os dados iniciais nas tabelas criadas pelo schema.sql.
-- Regiões e serviços foram copiados das APIs do projeto:
--   https://carbon.unilaunch.org/regions
--   https://metrics.unilaunch.org/services
--
-- Como rodar (dentro do psql, conectado ao banco do projeto):
--   \i database/schema.sql
--   \i database/seed.sql
--
-- ATENÇÃO: o TRUNCATE abaixo apaga os dados que já existirem.
-- Use somente em banco de desenvolvimento.
-- =====================================================================

-- Tudo entre BEGIN e COMMIT é gravado junto: se um INSERT falhar,
-- nada é gravado.
BEGIN;


-- ---------------------------------------------------------------------
-- 1. Limpar as tabelas
-- RESTART IDENTITY faz os ids voltarem a começar do 1.
-- CASCADE limpa também as tabelas que dependem delas.
-- ---------------------------------------------------------------------
TRUNCATE TABLE configuracoes, regioes, aplicacoes, usuarios
    RESTART IDENTITY CASCADE;


-- ---------------------------------------------------------------------
-- 2. Tabelas sem chave estrangeira
-- ---------------------------------------------------------------------

-- Intervalo padrão entre uma coleta de métricas e outra.
INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('intervalo_coleta_segundos', '60', 'Intervalo entre as coletas de métricas, em segundos');

-- Regiões da API de carbono. A unidade fica com o DEFAULT (gCO2e/kWh).
INSERT INTO regioes (nome, pais, fator_co2e_g_kwh, ano_referencia, fonte) VALUES
    ('Sudeste',  'Brazil',        85.0,  2026, 'carbon.unilaunch.org'),
    ('Virginia', 'United States', 378.0, 2026, 'carbon.unilaunch.org'),
    ('Leinster', 'Ireland',       295.0, 2026, 'carbon.unilaunch.org'),
    ('Ontario',  'Canada',        40.0,  2026, 'carbon.unilaunch.org'),
    ('Tokyo',    'Japan',         465.0, 2026, 'carbon.unilaunch.org');

-- A API não informa aplicação, então todos os serviços ficam nesta.
INSERT INTO aplicacoes (nome, descricao) VALUES
    ('GreenER Demo', 'Serviços monitorados da API de métricas do projeto');

-- Usuário de teste. Senha: greener123 (salva só como hash bcrypt).
INSERT INTO usuarios (nome, email, senha_hash) VALUES
    ('Usuário Teste', 'teste@greener.com',
     '$2a$10$DCiS624WhruIu5TMkYr/zu3l7OpPNFVvZFawp5PMBGfZcT84q5Bdm');


-- ---------------------------------------------------------------------
-- 3. Tabelas com chave estrangeira
-- O id da aplicação e da região é buscado pelo nome, assim não
-- dependemos do número que o BIGSERIAL gerou.
-- ---------------------------------------------------------------------

-- Serviços da API de métricas. O status fica com o DEFAULT ('ativo').
-- A coluna "ordem" só serve para os ids seguirem a ordem da API.
-- IDs externos confirmados na API; nomes não identificam serviços de forma única.
INSERT INTO servicos (
    id_externo, aplicacao_id, regiao_id, nome, cidade, latitude, longitude
)
SELECT s.id_externo, a.id, r.id, s.nome, s.cidade, s.latitude, s.longitude
FROM (VALUES
    (1, 'billing-api',       'Billing API',       'Sudeste',  'Brazil',        'Sao Paulo', -23.5505, -46.6333),
    (2, 'checkout-worker',   'Checkout Worker',   'Virginia', 'United States', 'Ashburn',    39.0438, -77.4874),
    (3, 'recommendation-ai', 'Recommendation AI', 'Leinster', 'Ireland',       'Dublin',     53.3498,  -6.2603),
    (4, 'inventory-sync',    'Inventory Sync',    'Ontario',  'Canada',        'Toronto',    43.6532, -79.3832),
    (5, 'audit-stream',      'Audit Stream',      'Tokyo',    'Japan',         'Tokyo',      35.6762, 139.6503),
    (6, 'email-dispatcher',  'Email Dispatcher',  'Sudeste',  'Brazil',        'Sao Paulo', -23.5505, -46.6333),
    (7, 'fraud-detector',    'Fraud Detector',    'Virginia', 'United States', 'Ashburn',    39.0438, -77.4874),
    (8, 'reporting-batch',   'Reporting Batch',   'Ontario',  'Canada',        'Toronto',    43.6532, -79.3832)
) AS s (ordem, id_externo, nome, regiao, pais, cidade, latitude, longitude)
JOIN regioes r    ON r.nome = s.regiao AND r.pais = s.pais
JOIN aplicacoes a ON a.nome = 'GreenER Demo'
ORDER BY s.ordem;


COMMIT;
