-- =====================================================================
-- GreenER - schema.sql
-- Cria as tabelas do banco de dados (PostgreSQL).
-- Baseado no diagrama database/modelagem_bd.png.
--
-- Como rodar (dentro do psql, conectado ao banco do projeto):
--   \i database/schema.sql
--
-- ATENÇÃO: os DROP TABLE abaixo apagam as tabelas e os dados que já
-- existirem. Use somente em banco de desenvolvimento.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Apagar as tabelas antigas (se existirem)
-- A ordem é a inversa da criação: primeiro quem depende de outra tabela.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS metricas_servico;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS logs_sistema;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS aplicacoes;
DROP TABLE IF EXISTS regioes;
DROP TABLE IF EXISTS configuracoes;


-- ---------------------------------------------------------------------
-- 2. Tabelas sem chave estrangeira (não dependem de ninguém)
-- ---------------------------------------------------------------------

-- Configurações do sistema no formato chave/valor.
-- Ex.: chave = 'intervalo_coleta_segundos', valor = '60'
CREATE TABLE configuracoes (
    chave         VARCHAR(100) PRIMARY KEY,
    valor         TEXT         NOT NULL,
    descricao     VARCHAR(255),
    atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);

-- Regiões e o fator de emissão de CO2e da energia elétrica de cada uma.
CREATE TABLE regioes (
    id                BIGSERIAL     PRIMARY KEY,
    nome              VARCHAR(100)  NOT NULL,
    pais              VARCHAR(100)  NOT NULL,
    fator_co2e_g_kwh  NUMERIC(10,4) NOT NULL CHECK (fator_co2e_g_kwh >= 0),
    unidade           VARCHAR(20)   NOT NULL DEFAULT 'gCO2e/kWh',
    ano_referencia    INTEGER       NOT NULL CHECK (ano_referencia >= 2000),
    fonte             TEXT,
    criado_em         TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (nome, pais)
);

-- Aplicações que agrupam os serviços monitorados.
CREATE TABLE aplicacoes (
    id        BIGSERIAL    PRIMARY KEY,
    nome      VARCHAR(120) NOT NULL UNIQUE,
    descricao TEXT,
    criado_em TIMESTAMPTZ  DEFAULT NOW()
);

-- Usuários que acessam o sistema (login).
-- A senha nunca é salva em texto puro, só o hash dela.
CREATE TABLE usuarios (
    id         BIGSERIAL    PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em  TIMESTAMPTZ  DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 3. Tabelas com chave estrangeira (dependem das tabelas acima)
-- ---------------------------------------------------------------------

-- Registro das ações feitas no sistema.
-- usuario_id pode ficar vazio (ex.: ação feita pela rotina de coleta).
CREATE TABLE logs_sistema (
    id         BIGSERIAL    PRIMARY KEY,
    usuario_id BIGINT       REFERENCES usuarios (id),
    acao       VARCHAR(100) NOT NULL,
    detalhes   JSONB,
    criado_em  TIMESTAMPTZ  DEFAULT NOW()
);

-- Serviços monitorados. Cada serviço pertence a uma aplicação e a uma região.
CREATE TABLE servicos (
    id           BIGSERIAL     PRIMARY KEY,
    -- Id do serviço na API de métricas (ex.: servico-1); é a chave do upsert.
    id_externo   VARCHAR(100)  UNIQUE,
    aplicacao_id BIGINT        NOT NULL REFERENCES aplicacoes (id),
    regiao_id    BIGINT        NOT NULL REFERENCES regioes (id),
    nome         VARCHAR(120)  NOT NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'ativo'
                 CHECK (status IN ('ativo', 'indisponivel', 'removido')),
    cidade       VARCHAR(100),
    latitude     NUMERIC(10,8) CHECK (latitude BETWEEN -90 AND 90),
    longitude    NUMERIC(11,8) CHECK (longitude BETWEEN -180 AND 180),
    criado_em    TIMESTAMPTZ   DEFAULT NOW()
);

-- Cada linha é uma coleta de métricas de um serviço,
-- junto com o resultado do cálculo de energia e emissão.
CREATE TABLE metricas_servico (
    id                  BIGSERIAL     PRIMARY KEY,
    servico_id          BIGINT        NOT NULL REFERENCES servicos (id),
    coletado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    cpu_percentual      NUMERIC(5,2)  CHECK (cpu_percentual BETWEEN 0 AND 100),
    memoria_gb          NUMERIC(14,6) CHECK (memoria_gb >= 0),
    disco_gb            NUMERIC(14,6) CHECK (disco_gb >= 0),
    rede_gb             NUMERIC(14,6) CHECK (rede_gb >= 0),
    intervalo_segundos  INTEGER       CHECK (intervalo_segundos >= 0),
    status_coleta       VARCHAR(20)   NOT NULL
                        CHECK (status_coleta IN ('sucesso', 'sem_metricas', 'indisponivel')),
    potencia_estimada_w NUMERIC(16,8) CHECK (potencia_estimada_w >= 0),
    duracao_segundos    INTEGER       CHECK (duracao_segundos >= 0),
    energia_kwh         NUMERIC(18,8) CHECK (energia_kwh >= 0),
    emissao_co2e_g      NUMERIC(18,8) CHECK (emissao_co2e_g >= 0),
    calculado_em        TIMESTAMPTZ
);
