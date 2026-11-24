# 🏗️ Arquitetura e Modelo de Dados do GreenER

← [Voltar à documentação](README.md)

## 1. Visão geral

O **GreenER** é uma aplicação web de monitoramento ambiental de serviços computacionais. A plataforma recebe métricas de infraestrutura, como utilização de CPU, memória, disco e rede, e utiliza essas informações para estimar potência, consumo energético e emissões de dióxido de carbono equivalente (CO₂e).

O cálculo de emissões também considera a intensidade de carbono associada à região do serviço. Portanto, o GreenER apresenta **estimativas baseadas nas métricas e nos fatores configurados**, não uma medição elétrica direta do servidor.

A solução está organizada em quatro partes:

- **Frontend:** interface web para login, dashboard, histórico, ranking, comparação, mapa e área administrativa.
- **Backend:** servidor HTTP, regras de negócio, integrações externas, autenticação JWT, coordenação das coletas e consultas de análise.
- **Banco de dados:** PostgreSQL, responsável por armazenar serviços, regiões, aplicações, usuários, configurações e histórico das coletas.
- **APIs externas:** fontes de métricas de infraestrutura e de intensidade de carbono regional.

## 2. Diagrama da arquitetura

O diagrama representa a comunicação implementada entre os componentes do GreenER.

```mermaid
flowchart TD
    U[Usuário] --> F[Frontend<br/>React + TypeScript]
    F -->|HTTP /api| N[Nginx ou proxy Vite]
    N -->|Proxy para backend:3000| B[Backend<br/>Node.js + TypeScript]

    F -->|Token JWT nas rotas privadas| B
    B -->|Validação JWT| AUTH[Autenticação]

    B -->|SQL parametrizado| DB[(PostgreSQL)]
    B -->|GET /services<br/>GET /metrics/{id}| M[Greener Metrics Aggregator API]
    M -->|Serviços, localização e métricas| B
    B -->|GET /regions/{code}/carbon-intensity| C[Greener Carbon Intensity API]
    C -->|Intensidade regional| B

    B -->|Serviços e indicadores| F
    B -->|Histórico, ranking e comparação| F
```

### 2.1 Responsabilidade de cada componente

| Componente | Responsabilidade |
|---|---|
| Frontend | Apresentar serviços, estados, indicadores, análises e informações geográficas; gerenciar a sessão no navegador. |
| Nginx | Servir os arquivos de produção do frontend e encaminhar chamadas iniciadas em `/api/` ao backend. |
| Proxy Vite | Encaminhar `/api/` ao backend durante o desenvolvimento normal. |
| Backend | Receber requisições HTTP, validar JWT nas rotas privadas, executar regras de negócio, controlar coletas e consultar o banco e as APIs externas. |
| PostgreSQL | Persistir cadastros, configurações, usuários e histórico das coletas. |
| Metrics Aggregator API | Fornecer a lista de serviços, localização e métricas de infraestrutura. |
| Carbon Intensity API | Fornecer o fator regional de intensidade de carbono utilizado no cálculo de CO₂e. |

## 3. Frontend

O frontend foi desenvolvido com **React 19, TypeScript e Vite**. Sua responsabilidade é apresentar as informações disponibilizadas pelo backend e permitir que o usuário navegue entre as áreas do sistema.

A aplicação organiza os arquivos em `frontend/src/`:

| Diretório ou arquivo | Responsabilidade |
|---|---|
| `App.tsx` e `main.tsx` | Inicialização e composição da aplicação React. |
| `rotas.tsx` | Registro das rotas públicas, privadas e da rota de desenvolvimento para estados visuais. |
| `caminhos.ts` | Centralização dos caminhos de navegação. |
| `pages/` | Páginas de início, login, cadastro, dashboard, administração, histórico, ranking, comparação e mapa. |
| `components/` | Componentes reutilizáveis de interface, formulários, filtros, indicadores, navegação e visualizações. |
| `services/` | Cliente HTTP e integração com os endpoints do backend. |
| `hooks/` | Lógica reutilizável para consultas, atualização automática, filtros e diagnóstico da coleta. |
| `contexts/` e `providers/` | Estado e provedores compartilhados da aplicação. |
| `assets/` | Imagens e recursos visuais. |
| `utils/` | Funções auxiliares e validações. |

### 3.1 Rotas e áreas da aplicação

As principais rotas estão declaradas em `frontend/src/rotas.tsx`.

| Rota | Área | Acesso |
|---|---|---|
| `/` | Início e verificação de disponibilidade do backend | Pública |
| `/login` | Autenticação de usuários | Pública |
| `/cadastro` | Formulário de cadastro | Pública |
| `/dashboard` | Visão geral, serviços e indicadores | Privada |
| `/administrativa` | Indicadores, lista de serviços e consulta do intervalo de coleta | Privada |
| `/historico` | Histórico por serviço e período, com gráficos | Privada |
| `/ranking` | Ranking por energia ou CO₂e | Privada |
| `/comparacao` | Comparação de dois a cinco serviços | Privada |
| `/mapa` | Globo com os serviços que possuem coordenadas | Privada |
| `/dashboard/estados` | Galeria de estados visuais para desenvolvimento | Somente desenvolvimento |

As rotas privadas são agrupadas pelo componente `RotaPrivada`. Sem token armazenado, o usuário é direcionado para `/login`.

### 3.2 Comunicação com o backend

As chamadas HTTP do frontend utilizam o cliente centralizado em `frontend/src/services/api.ts`. A URL-base é `/api`.

- Em Docker, o Nginx encaminha `/api/` ao serviço `backend`, na porta `3000`.
- Em desenvolvimento normal, o Vite utiliza um proxy para `http://localhost:3000`.
- Em desenvolvimento com `npm run dev:mock`, o plugin `frontend/mock-servicos.ts` responde às rotas simuladas sem utilizar o backend.

O cliente HTTP disponibiliza operações GET, POST e PUT. Quando existe um JWT armazenado, o token é enviado no cabeçalho `Authorization: Bearer <token>`.

### 3.3 Autenticação e sessão no frontend

Após o login, o token JWT recebido de `POST /auth/login` é armazenado:

- em `localStorage`, quando a opção “Lembrar de mim” está marcada;
- em `sessionStorage`, quando a opção não está marcada.

O cliente HTTP acrescenta o token às requisições. O tratamento global de respostas `401` remove o token e redireciona para o login.

O botão de logout remove o token de `localStorage` e `sessionStorage` e navega para `/login`. **Não existe endpoint de logout no backend**: como o JWT é stateless, ele permanece válido até expirar, com validade de uma hora. O logout encerra a sessão no navegador, mas não revoga o token no servidor.

O formulário de cadastro envia nome, e-mail, senha, tipo de pessoa e documento. O backend atual persiste nome, e-mail e hash da senha; os campos `tipoPessoa` e `documento` ainda não são validados nem armazenados.

### 3.4 Consultas e telas de análise

| Área | Endpoint principal | Finalidade |
|---|---|---|
| Início | `GET /health/ready` | Verificar a disponibilidade do backend e do PostgreSQL. |
| Dashboard | `GET /services` | Obter serviços, estado, localização e dados da última coleta. |
| Dashboard | `GET /dashboard/indicadores` | Consultar consumo, emissão, contagem de serviços, última coleta e intervalo. |
| Diagnóstico | `GET /collections/rotina/status` | Consultar o estado da rotina e as falhas ativas. |
| Configuração | `GET /monitoring-settings` | Consultar o intervalo de coleta salvo. |
| Histórico | `GET /analytics/historico/:servicoId` | Consultar coletas de um serviço no período. |
| Ranking | `GET /analytics/ranking` | Classificar serviços por energia ou CO₂e, por total ou média. |
| Comparação | `GET /analytics/comparacao` | Comparar dois a cinco serviços no mesmo período. |

O intervalo de atualização da interface é independente do intervalo de coleta do backend. O dashboard consulta serviços e indicadores periodicamente e mantém filtros, busca, ordenação e modo de visualização durante as atualizações.

### 3.5 Filtros e atualização automática

A lógica dos filtros está em `frontend/src/filtros.ts`, `frontend/src/hooks/useFiltrosAnalise.ts` e `frontend/src/components/FiltrosAnalise.tsx`.

Os filtros compartilhados incluem:

- serviço;
- região;
- período de 1 hora, 24 horas, 7 dias ou intervalo personalizado.

O estado dos filtros é armazenado em `sessionStorage` para ser reutilizado no dashboard, histórico, ranking e comparação e para sobreviver a uma atualização da página.

No dashboard, o período não altera os valores exibidos na lista: ela mostra a coleta mais recente de cada serviço. O período é usado nas consultas de análise.

As consultas automáticas de serviços e indicadores preservam os últimos dados válidos quando uma atualização falha. A interface mostra um aviso de possível desatualização e tenta novamente no ciclo seguinte.

### 3.6 Mapa dos serviços

A rota `/mapa` apresenta um globo estilizado em SVG, construído com projeção ortográfica e os pacotes `d3-geo` e `world-atlas`.

- Cada pino corresponde a um serviço que possui latitude e longitude válidas.
- Ao selecionar um pino ou item da lista, a tela apresenta os dados de localização recebidos pelo backend.
- Serviços sem coordenadas continuam disponíveis no dashboard e são contabilizados em um aviso de itens não representados no globo.
- Serviços com a mesma coordenada podem compartilhar um pino.

A tela utiliza `GET /services`; não existe uma API geográfica externa nem um endpoint para editar coordenadas.

## 4. Backend

O backend utiliza **Node.js e TypeScript**. Ele concentra as regras de negócio e intermedeia a comunicação entre o frontend, o PostgreSQL e as APIs externas.

O servidor HTTP é iniciado por `backend/src/server.ts`. O arquivo `backend/src/app.ts` reúne as listas de rotas dos módulos, trata os endpoints de saúde e encaminha cada requisição ao handler correspondente.

### 4.1 Organização em camadas

Os módulos seguem, de forma geral, a separação:

**routes → controller → service → repository**

| Camada | Responsabilidade |
|---|---|
| Routes | Associa método HTTP e caminho ao handler e aplica autenticação nas rotas privadas. |
| Controller | Interpreta os dados da requisição, chama os serviços e monta a resposta HTTP. |
| Service | Coordena regras de negócio e fluxos de execução. |
| Repository | Executa operações de leitura e gravação no PostgreSQL por consultas parametrizadas. |

### 4.2 Módulos implementados

Os principais módulos encontram-se em `backend/src/modules/`:

| Módulo | Responsabilidade |
|---|---|
| `auth/` | Cadastro, autenticação, geração/verificação de JWT, middleware de proteção e limitação de tentativas de login. |
| `collections/` | Descoberta de serviços, coleta manual e periódica, histórico, agendamento e diagnóstico da rotina. |
| `configuracoes/` | Leitura da configuração persistida, incluindo o intervalo de coleta. |
| `dashboard-indicators/` | Consolidação dos indicadores apresentados no dashboard. |
| `monitoring-settings/` | Consulta autenticada das configurações de monitoramento. |
| `analytics/` | Consultas por período para histórico, ranking, comparação e agregações internas. |
| `resultados/` | Persistência e consulta dos resultados calculados. |
| `services/` | Consulta, cadastro, atualização e sincronização da presença dos serviços monitorados. |

Outros diretórios relevantes:

| Diretório | Responsabilidade |
|---|---|
| `src/db/` | Pool de conexões PostgreSQL, execução de consultas e verificação de disponibilidade. |
| `src/integrations/` | Clientes e validações das respostas das APIs externas. |
| `src/calculos/` | Cálculos de potência, energia e emissões de CO₂e. |
| `src/mocks/` | API simulada para as integrações externas e testes. |
| `src/shared/` | Funções HTTP compartilhadas entre módulos. |

### 4.3 Autenticação JWT

O backend emite JWT com algoritmo HS256 por `POST /auth/login`. O token:

- identifica o usuário no claim `sub`;
- tem validade de uma hora;
- utiliza o emissor `greener-backend` e a audiência `greener`;
- é assinado com `JWT_SECRET`, que deve conter pelo menos 32 bytes.

O middleware `exigirAutenticacao` valida o cabeçalho `Authorization: Bearer <token>` antes de executar os handlers protegidos. Quando o token está ausente, inválido ou expirado, a resposta é HTTP `401`.

As rotas de saúde, login e cadastro são públicas. Serviços, coletas, indicadores, configurações e análises exigem JWT. Não há endpoint de revogação/logout no backend.

### 4.4 Inicialização e agendamento da coleta

Quando o servidor HTTP inicia, a rotina é iniciada automaticamente por padrão. Esse comportamento pode ser desativado com `COLLECTIONS_AUTO_START=false`.

A rotina:

1. consulta `GET /services` na Metrics Aggregator API;
2. sincroniza a presença dos serviços no banco;
3. consulta as métricas de cada serviço;
4. utiliza o intervalo definido pela aplicação;
5. agenda a próxima coleta e uma nova descoberta;
6. mantém diagnóstico das tentativas e falhas.

**O intervalo de agendamento é lido da tabela `configuracoes`, na chave `intervalo_coleta_segundos` (60 segundos no seed).** O campo `collection_interval_seconds` que vem junto às métricas representa a duração da amostra usada para calcular a energia; ele não define o agendamento da próxima coleta.

As coletas de serviços diferentes podem ocorrer em paralelo. Para um mesmo serviço, uma coleta pendente é aguardada antes de iniciar outra. Falhas em uma coleta são registradas e a rotina programa uma nova tentativa no ciclo seguinte.

O endpoint `GET /monitoring-settings` retorna o valor persistido. Embora o frontend tenha uma função preparada para `PUT /monitoring-settings`, o backend atual registra somente a rota GET. Portanto, a alteração do intervalo pela interface ainda não está disponível.

## 5. Integrações externas

O backend utiliza duas integrações externas, implementadas em `backend/src/integrations/`.

### 5.1 Greener Metrics Aggregator API

- Documentação: [https://metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs)
- URL base padrão: `https://metrics.unilaunch.org`
- Variável de configuração: `METRICS_API_URL`

| Método | Endpoint externo | Finalidade |
|---|---|---|
| GET | `/services` | Listar serviços monitorados e suas informações de localização. |
| GET | `/services/{id}` | Consultar um serviço pelo identificador externo. |
| GET | `/metrics/{id}` | Consultar métricas e intervalo da amostra de um serviço. |

As métricas utilizadas incluem CPU (`cpu_percent`), memória (`memory_gb`), disco (`disk_gb`), rede (`network_gb`) e duração da amostra (`collection_interval_seconds`).

### 5.2 Greener Carbon Intensity API

- Documentação: [https://carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)
- URL base padrão: `https://carbon.unilaunch.org`
- Variável de configuração: `CARBON_API_URL`

| Método | Endpoint externo | Finalidade |
|---|---|---|
| GET | `/regions` | Listar regiões e seus fatores. |
| GET | `/regions/{codigo}` | Consultar uma região. |
| GET | `/regions/{codigo}/carbon-intensity` | Consultar a intensidade de carbono da região. |

O backend utiliza `location.region_code`, recebido da API de métricas, para consultar a intensidade de carbono correspondente ao serviço.

### 5.3 Tratamento de respostas externas

As duas integrações utilizam o cliente compartilhado `backend/src/integrations/api-client.ts`, que:

- envia requisições GET com `Accept: application/json`;
- aplica timeout configurado por `API_TIMEOUT_MS` (padrão de 10.000 ms);
- inclui a leitura do corpo da resposta dentro do limite de tempo;
- valida JSON e campos esperados;
- classifica falhas como HTTP, timeout, rede ou resposta inválida.

O cliente não repete imediatamente uma mesma requisição. Na rotina periódica, uma falha é registrada e uma nova tentativa ocorre em um ciclo posterior.

Dados ausentes não são convertidos em zero. Quando a coleta de métricas ocorre, mas o cálculo não pode ser concluído por falta de região ou falha na API de carbono, as métricas recebidas podem ser preservadas sem os campos calculados.

## 6. Fluxo de dados da coleta ao dashboard

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler (Backend)
    participant M as Metrics API
    participant C as Carbon API
    participant K as Calculadora
    participant DB as PostgreSQL
    participant F as Frontend

    S->>M: GET /services
    M-->>S: Serviços e localização
    S->>DB: Sincronizar presença e cadastro

    loop Para cada serviço
        S->>M: GET /metrics/{id}
        M-->>S: Métricas e duração da amostra
        alt Métricas e região disponíveis
            S->>C: GET /regions/{region_code}/carbon-intensity
            C-->>S: Intensidade de carbono regional
            S->>K: Calcular potência, energia e CO₂e
            K-->>S: Resultados estimados
            S->>DB: Gravar métricas e resultados
        else Sem métricas, falha ou região ausente
            S->>DB: Gravar estado e dados disponíveis
        end
    end

    F->>S: GET /services (JWT)
    S->>DB: Consultar serviços e última coleta
    DB-->>S: Serviços e dados disponíveis
    S-->>F: Resposta JSON

    F->>S: GET /dashboard/indicadores (JWT)
    S->>DB: Consultar indicadores consolidados
    DB-->>S: Consumo, emissões, contagens e última coleta
    S-->>F: Resposta JSON

    F->>S: GET /analytics/* (JWT)
    S->>DB: Consultar histórico, ranking ou comparação
    DB-->>S: Dados agregados por período
    S-->>F: Resposta JSON
```

## 7. Análises e visualizações por período

O módulo `backend/src/modules/analytics/` disponibiliza três endpoints protegidos por JWT:

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/analytics/historico/:servicoId` | Retornar os pontos de coleta de um serviço no período, com paginação, ordenação e filtro por sucesso. |
| GET | `/analytics/ranking` | Classificar serviços por energia ou CO₂e, por total ou média, com filtros e tendência em relação ao período anterior. |
| GET | `/analytics/comparacao` | Comparar dois a cinco serviços no mesmo período, preservando a ordem solicitada. |

O ranking possui duas formas de resposta:

- sem `agregacao`: resposta simples com totais e médias do período;
- com `agregacao=total` ou `agregacao=media`: resposta detalhada com aplicação, tendência, resumo, aplicações disponíveis e primeiro colocado.

A comparação mantém serviços sem dados no período, atribui valores zerados à resposta de comparação e acrescenta avisos. Isso é diferente de uma medição válida igual a zero, que é preservada como dado real.

O repositório também contém uma função interna genérica de agregação por serviço, região, aplicação, dia ou hora. Essa função não possui endpoint HTTP público nesta versão.

## 8. Modelo de dados

O banco de dados utiliza **PostgreSQL**. A definição das tabelas está em `database/schema.sql`, os dados iniciais em `database/seed.sql` e as alterações para bancos já existentes em `database/migrations/`.

O modelo atual possui sete tabelas.

### 8.1 Diagrama entidade-relacionamento

```mermaid
erDiagram
    APLICACOES ||--o{ SERVICOS : agrupa
    REGIOES o|--o{ SERVICOS : localiza
    SERVICOS ||--o{ METRICAS_SERVICO : possui
    USUARIOS o|--o{ LOGS_SISTEMA : registra

    CONFIGURACOES {
        varchar chave PK
        text valor
        varchar descricao
        timestamptz atualizado_em
    }
    REGIOES {
        bigserial id PK
        varchar nome
        varchar pais
        numeric fator_co2e_g_kwh
        varchar unidade
        integer ano_referencia
        text fonte
        timestamptz criado_em
    }
    APLICACOES {
        bigserial id PK
        varchar nome
        text descricao
        timestamptz criado_em
    }
    USUARIOS {
        bigserial id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        timestamptz criado_em
    }
    LOGS_SISTEMA {
        bigserial id PK
        bigint usuario_id FK
        varchar acao
        jsonb detalhes
        timestamptz criado_em
    }
    SERVICOS {
        bigserial id PK
        varchar id_externo UK
        bigint aplicacao_id FK
        bigint regiao_id FK
        varchar nome
        varchar status
        varchar cidade
        numeric latitude
        numeric longitude
        timestamptz criado_em
    }
    METRICAS_SERVICO {
        bigserial id PK
        bigint servico_id FK
        timestamptz coletado_em
        numeric cpu_percentual
        numeric memoria_gb
        numeric disco_gb
        numeric rede_gb
        integer intervalo_segundos
        varchar status_coleta
        numeric potencia_estimada_w
        integer duracao_segundos
        numeric energia_kwh
        numeric emissao_co2e_g
        timestamptz calculado_em
    }
```

### 8.2 Descrição das tabelas

#### `configuracoes`

Armazena configurações gerais no formato chave/valor.

| Campo | Tipo | Descrição |
|---|---|---|
| `chave` | `VARCHAR(100)` | Chave primária. |
| `valor` | `TEXT` | Valor armazenado. |
| `descricao` | `VARCHAR(255)` | Descrição opcional. |
| `atualizado_em` | `TIMESTAMPTZ` | Data e hora da atualização. |

O seed inclui a chave `intervalo_coleta_segundos`, com valor inicial `60`.

#### `regioes`

Armazena as regiões e os fatores de intensidade de carbono.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(100)` | Nome da região. |
| `pais` | `VARCHAR(100)` | País da região. |
| `fator_co2e_g_kwh` | `NUMERIC(10,4)` | Fator em gCO₂e/kWh. |
| `unidade` | `VARCHAR(20)` | Unidade do fator. |
| `ano_referencia` | `INTEGER` | Ano de referência. |
| `fonte` | `TEXT` | Fonte do fator. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

A combinação de nome e país é única.

#### `aplicacoes`

Agrupa os serviços monitorados.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(120)` | Nome único da aplicação. |
| `descricao` | `TEXT` | Descrição opcional. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

#### `usuarios`

Armazena as contas usadas no login.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(100)` | Nome do usuário. |
| `email` | `VARCHAR(150)` | E-mail único. |
| `senha_hash` | `VARCHAR(255)` | Hash bcrypt da senha. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

O schema atual não possui colunas de perfil, tipo de pessoa ou documento.

#### `logs_sistema`

Estrutura para registrar ações do sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `usuario_id` | `BIGINT` | Referência opcional a `usuarios`. |
| `acao` | `VARCHAR(100)` | Identificação da ação. |
| `detalhes` | `JSONB` | Detalhes adicionais. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora do registro. |

A tabela está definida no schema; isso não significa que todos os eventos da aplicação sejam gravados nela.

#### `servicos`

Armazena os serviços monitorados e suas informações de localização.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária interna. |
| `id_externo` | `VARCHAR(100)` | Identificador do serviço na API de métricas, com unicidade. |
| `aplicacao_id` | `BIGINT` | Referência obrigatória a `aplicacoes`. |
| `regiao_id` | `BIGINT` | Referência opcional a `regioes`. |
| `nome` | `VARCHAR(120)` | Nome do serviço. |
| `status` | `VARCHAR(20)` | `ativo`, `indisponivel` ou `removido`. |
| `cidade` | `VARCHAR(100)` | Cidade, quando informada. |
| `latitude` | `NUMERIC(10,8)` | Latitude, quando disponível. |
| `longitude` | `NUMERIC(11,8)` | Longitude, quando disponível. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

#### `metricas_servico`

Armazena o histórico das coletas e os resultados calculados disponíveis.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária da coleta. |
| `servico_id` | `BIGINT` | Referência a `servicos`. |
| `coletado_em` | `TIMESTAMPTZ` | Data e hora da coleta. |
| `cpu_percentual` | `NUMERIC(5,2)` | Utilização de CPU em percentual. |
| `memoria_gb` | `NUMERIC(14,6)` | Memória em GB. |
| `disco_gb` | `NUMERIC(14,6)` | Disco em GB. |
| `rede_gb` | `NUMERIC(14,6)` | Rede em GB. |
| `intervalo_segundos` | `INTEGER` | Duração associada à amostra, em segundos. |
| `status_coleta` | `VARCHAR(20)` | `sucesso`, `sem_metricas` ou `indisponivel`. |
| `potencia_estimada_w` | `NUMERIC(16,8)` | Potência estimada em Watts. |
| `duracao_segundos` | `INTEGER` | Duração utilizada no cálculo, em segundos. |
| `energia_kwh` | `NUMERIC(18,8)` | Energia estimada em kWh. |
| `emissao_co2e_g` | `NUMERIC(18,8)` | Emissão estimada em gramas de CO₂e. |
| `calculado_em` | `TIMESTAMPTZ` | Data e hora do cálculo. |

Campos de métricas e cálculo aceitam nulo quando os dados não estavam disponíveis ou o cálculo não foi concluído. Cada coleta gera um novo registro.

### 8.3 Relacionamentos e integridade

| Origem | Destino | Cardinalidade | Descrição |
|---|---|---|---|
| `aplicacoes` | `servicos` | 1:N | Uma aplicação agrupa vários serviços. |
| `regioes` | `servicos` | 1:N opcional | Uma região pode estar associada a vários serviços; a região do serviço pode ser nula. |
| `servicos` | `metricas_servico` | 1:N | Um serviço possui várias coletas históricas. |
| `usuarios` | `logs_sistema` | 1:N opcional | Um registro pode não possuir usuário associado. |

O schema aplica unicidade para e-mail, nome da aplicação e identificador externo. Também restringe latitude, longitude, CPU, valores não negativos e os estados de serviço e coleta.

### 8.4 Migrações

As migrações ficam em `database/migrations/`. A migration inicial cria a estrutura atual; as seguintes ajustam bancos já existentes. Consulte o [README do banco](../database/README.md) para a ordem de aplicação e os cuidados com volumes que já possuem dados.

## 9. Execução e configuração

O projeto utiliza Docker Compose:

| Serviço | Função | Porta publicada padrão |
|---|---|---|
| `database` | PostgreSQL. | `5432` |
| `backend` | API HTTP, regras de negócio e coleta. | `3000` |
| `frontend` | Aplicação web servida pelo Nginx. | `8080` |

As variáveis de ambiente relacionadas ao backend incluem:

| Variável | Finalidade |
|---|---|
| `PORT` | Porta HTTP do backend. |
| `METRICS_API_URL` | URL base da API de métricas. |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. |
| `API_TIMEOUT_MS` | Timeout das chamadas externas, em milissegundos. |
| `COLLECTIONS_AUTO_START` | Controla a inicialização automática da rotina. |
| `JWT_SECRET` | Segredo de assinatura dos JWTs; deve conter pelo menos 32 bytes. |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | Conexão com PostgreSQL. |
| `PGCONNECT_TIMEOUT`, `PGQUERY_TIMEOUT_MS` | Limites da conexão e de consultas ao banco. |

Os comandos de inicialização estão no [README principal](../README.md) e nos READMEs específicos.

## 10. Mocks e testes

Há dois mecanismos de mock com objetivos diferentes:

- `backend/src/mocks/`: simula as APIs externas de métricas e carbono para testar os clientes do backend;
- `frontend/mock-servicos.ts`: simula respostas da própria API GreenER durante o desenvolvimento da interface.

O uso, as rotas e os cenários estão descritos em [`mocks.md`](./mocks.md).

## 11. Diagramas de referência

Os diagramas de casos de uso, classes e sequência criados na Sprint 1 são referências do desenho inicial. Para o comportamento implementado, prevalecem as rotas, os módulos e as tabelas descritos neste documento e nos arquivos `backend/src/app.ts`, `backend/src/modules/` e `database/schema.sql`.

## 12. Referências relacionadas

- [Documentação da API](./api.md)
- [Documentação dos cálculos](./calculos.md)
- [Mocks locais](./mocks.md)
- [Plano de entregas](./plano-de-entregas.md)
- [README do banco de dados](../database/README.md)
- [README do backend](../backend/README.md)
- [README do frontend](../frontend/README.md)
- [Schema do banco](../database/schema.sql)
- [Seed do banco](../database/seed.sql)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
# 🏗️ Arquitetura e Modelo de Dados do GreenER

← [Voltar à documentação](README.md)

## 1. Visão geral

O **GreenER** é uma aplicação web de monitoramento ambiental de serviços computacionais. A plataforma recebe métricas de infraestrutura, como utilização de CPU, memória, disco e rede, e utiliza essas informações para estimar potência, consumo energético e emissões de dióxido de carbono equivalente (CO₂e).

O cálculo de emissões considera também a intensidade de carbono associada à região do serviço. Portanto, o GreenER apresenta **estimativas baseadas nas métricas e nos fatores configurados**, não uma medição elétrica direta do servidor.

A solução está organizada em quatro partes:

- **Frontend:** interface web que apresenta o estado dos serviços e os indicadores disponíveis.
- **Backend:** servidor HTTP, regras de negócio, integrações externas, autenticação e coordenação das coletas.
- **Banco de dados:** PostgreSQL, responsável por armazenar serviços, regiões, aplicações, usuários, configurações e histórico de coletas.
- **APIs externas:** fontes de métricas de infraestrutura e de intensidade de carbono regional.

## 2. Diagrama da arquitetura

O diagrama abaixo representa o fluxo implementado entre os componentes do GreenER.

```mermaid
flowchart TD
    U[Usuário] --> F[Frontend<br/>React + TypeScript]
    F -->|HTTP /api| N[Nginx]
    N -->|Proxy para backend:3000| B[Backend<br/>Node.js + TypeScript]

    B -->|Consulta e gravação SQL| DB[(PostgreSQL)]

    B -->|GET /services<br/>GET /metrics/{id}| M[Greener Metrics Aggregator API]
    M -->|Serviços, localização e métricas| B

    B -->|GET /regions/{code}/carbon-intensity| C[Greener Carbon Intensity API]
    C -->|Intensidade regional de carbono| B

    B -->|Indicadores, serviços e status| F
```

### 2.1 Responsabilidade de cada componente

| Componente | Responsabilidade |
|---|---|
| Frontend | Apresentar os dados recebidos, estados de carregamento e falha, serviços e indicadores. |
| Nginx | Servir os arquivos do frontend e encaminhar as chamadas iniciadas em `/api/` ao backend. |
| Backend | Receber requisições HTTP, executar regras de negócio, controlar coletas e acessar as integrações e o banco. |
| PostgreSQL | Persistir os cadastros e o histórico das coletas. |
| Metrics Aggregator API | Fornecer a lista de serviços, localização e métricas de infraestrutura. |
| Carbon Intensity API | Fornecer o fator regional de intensidade de carbono utilizado no cálculo de CO₂e. |

## 3. Frontend

O frontend foi desenvolvido com **React 19, TypeScript e Vite**. Sua responsabilidade é oferecer a interface de consulta do GreenER e consumir os dados disponibilizados pelo backend.

A aplicação organiza os arquivos em `frontend/src/`:

| Diretório ou arquivo | Responsabilidade |
|---|---|
| `App.tsx` | Composição principal da aplicação e configuração dos provedores. |
| `rotas.tsx` | Definição das rotas e associação com as páginas. |
| `caminhos.ts` | Centralização dos caminhos utilizados na navegação. |
| `pages/` | Páginas da aplicação, como início, login, dashboard e área administrativa. |
| `components/` | Componentes reutilizáveis da interface. |
| `services/` | Comunicação HTTP com o backend e normalização dos dados recebidos. |
| `hooks/` | Lógica reutilizável de estado e consulta de dados. |
| `contexts/` | Contextos compartilhados entre componentes. |
| `providers/` | Provedores de contexto utilizados pela aplicação. |
| `assets/` | Imagens e recursos visuais. |
| `utils/` | Funções auxiliares reutilizáveis. |

### 3.1 Comunicação com o backend

As chamadas HTTP do frontend utilizam o cliente centralizado em `frontend/src/services/api.ts`. A URL-base utilizada pela aplicação é `/api`.

No ambiente com Docker, o Nginx recebe as chamadas em `/api/` e as encaminha ao serviço `backend`, na porta `3000`. Em desenvolvimento, o frontend utiliza a configuração de proxy do Vite.

O cliente HTTP disponibiliza operações GET, POST e PUT. Quando existe um JWT armazenado, o token é enviado no cabeçalho `Authorization: Bearer <token>`.

### 3.2 Consultas realizadas pela interface

Entre as consultas utilizadas pela aplicação estão:

| Recurso | Endpoint | Finalidade |
|---|---|---|
| Prontidão do ambiente | `GET /health/ready` | Verificar a disponibilidade do backend e do PostgreSQL na tela de início. |
| Serviços | `GET /services` | Obter os serviços cadastrados e os dados da última coleta disponíveis na resposta. |
| Indicadores | `GET /dashboard/indicadores` | Consultar consumo, emissão e contagens de serviços. |
| Diagnóstico da coleta | `GET /collections/rotina/status` | Consultar o estado da rotina e as falhas ativas. |

O hook `useMonitoramentoColeta` consulta o diagnóstico da rotina a cada cinco segundos. A consulta da lista de serviços é realizada pelo hook `useServicos` na carga da tela e pode ser repetida pela ação de atualização.

## 4. Backend

O backend utiliza **Node.js e TypeScript**. Ele concentra as regras de negócio e intermedeia a comunicação entre o frontend, o PostgreSQL e as APIs externas.

O servidor HTTP é iniciado por `backend/src/server.ts`, enquanto `backend/src/app.ts` reúne as rotas e direciona cada requisição ao respectivo handler.

### 4.1 Organização em camadas

Os módulos do backend seguem, de forma geral, a separação:

**routes → controller → service → repository**

| Camada | Responsabilidade |
|---|---|
| Routes | Associa método HTTP e caminho à função que tratará a requisição. |
| Controller | Interpreta os dados da requisição, chama os serviços e monta a resposta HTTP. |
| Service | Coordena as regras de negócio e o fluxo de execução. |
| Repository | Executa as operações de leitura e gravação no PostgreSQL. |

### 4.2 Módulos implementados

Os principais módulos encontram-se em `backend/src/modules/`:

| Módulo | Responsabilidade |
|---|---|
| `auth/` | Autenticação de usuários, emissão e validação de JWT e limitação de tentativas de login. |
| `collections/` | Execução manual e periódica das coletas, consulta do histórico e diagnóstico da rotina. |
| `configuracoes/` | Consulta de configuração utilizada como intervalo alternativo da coleta. |
| `dashboard-indicators/` | Consolidação dos indicadores apresentados pelo dashboard. |
| `monitoring-settings/` | Consulta das configurações de monitoramento protegida por autenticação. |
| `resultados/` | Acesso aos resultados calculados persistidos. |
| `services/` | Consulta e persistência dos serviços monitorados. |

Outros diretórios relevantes:

| Diretório | Responsabilidade |
|---|---|
| `src/db/` | Criação do pool de conexões, execução de consultas e verificação de disponibilidade do PostgreSQL. |
| `src/integrations/` | Clientes e validações das respostas das APIs externas. |
| `src/calculos/` | Cálculos de potência, energia e emissões de CO₂e. |
| `src/mocks/` | Dados e servidor de apoio a cenários simulados e testes. |
| `src/shared/` | Funções HTTP compartilhadas entre os módulos. |

### 4.3 Inicialização da coleta periódica

Quando o servidor HTTP inicia, a coleta periódica é iniciada automaticamente por padrão. Esse comportamento pode ser controlado pela variável `COLLECTIONS_AUTO_START`.

A rotina realiza uma descoberta dos serviços e agenda coletas individuais. Cada serviço utiliza o intervalo informado pela API de métricas, quando válido. O intervalo alternativo configurado é utilizado como fallback.

A rotina também permite execução manual e consulta de status. Uma coleta de um mesmo serviço não é executada em paralelo com outra coleta pendente daquele serviço.

## 5. Integrações externas

O backend utiliza duas integrações externas, implementadas em `backend/src/integrations/`.

### 5.1 Greener Metrics Aggregator API

- Documentação: [https://metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs)
- URL base padrão: `https://metrics.unilaunch.org`
- Variável de configuração: `METRICS_API_URL`

A integração disponibiliza:

| Método | Endpoint externo | Finalidade |
|---|---|---|
| GET | `/services` | Listar os serviços monitorados e suas informações de localização. |
| GET | `/services/{id}` | Consultar um serviço pelo identificador externo. |
| GET | `/metrics/{id}` | Consultar métricas e intervalo de coleta de um serviço. |

As métricas utilizadas pelo GreenER incluem:

- `cpu_percent`: utilização de CPU em percentual;
- `memory_gb`: memória em GB;
- `disk_gb`: disco em GB;
- `network_gb`: rede em GB;
- `collection_interval_seconds`: intervalo de coleta em segundos.

### 5.2 Greener Carbon Intensity API

- Documentação: [https://carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)
- URL base padrão: `https://carbon.unilaunch.org`
- Variável de configuração: `CARBON_API_URL`

A integração disponibiliza:

| Método | Endpoint externo | Finalidade |
|---|---|---|
| GET | `/regions` | Listar regiões disponíveis e seus fatores. |
| GET | `/regions/{codigo}` | Consultar uma região pelo código. |
| GET | `/regions/{codigo}/carbon-intensity` | Consultar a intensidade de carbono da região. |

O backend utiliza `location.region_code`, recebido da API de métricas, para consultar a intensidade de carbono correspondente ao serviço.

### 5.3 Tratamento das respostas externas

As duas integrações utilizam o cliente compartilhado `api-client.ts`, que:

- envia requisições GET com `Accept: application/json`;
- aplica o timeout configurado;
- valida se a resposta possui JSON válido;
- valida os campos esperados pelas integrações;
- classifica falhas como HTTP, timeout, rede ou resposta inválida.

Uma resposta inválida ou uma falha externa não deve ser convertida em métricas iguais a zero. Quando não há dados suficientes para concluir o cálculo, a aplicação preserva a informação disponível e representa os campos de cálculo ausentes como nulos.

## 6. Fluxo de dados da coleta ao dashboard

O fluxo a seguir representa a rotina de coleta e a disponibilização dos resultados.

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler (Backend)
    participant M as Metrics API
    participant C as Carbon API
    participant K as Calculadora
    participant DB as PostgreSQL
    participant F as Frontend

    S->>M: GET /services
    M-->>S: Serviços e localização

    loop Para cada serviço
        S->>M: GET /metrics/{id}
        M-->>S: CPU, RAM, disco, rede e intervalo
        S->>DB: Cadastrar ou atualizar serviço

        alt Métricas disponíveis e região informada
            S->>C: GET /regions/{region_code}/carbon-intensity
            C-->>S: Intensidade de carbono regional
            S->>K: Calcular potência, energia e CO₂e
            K-->>S: Resultados estimados
            S->>DB: Gravar métricas e resultados
        else Sem métricas ou sem dados para cálculo
            S->>DB: Gravar dados disponíveis e status
        end
    end

    F->>S: GET /services
    S->>DB: Consultar serviços e última coleta
    DB-->>S: Serviços e dados disponíveis
    S-->>F: Resposta JSON

    F->>S: GET /dashboard/indicadores
    S->>DB: Consultar indicadores consolidados
    DB-->>S: Consumo, emissões e contagens
    S-->>F: Resposta JSON
```

### 6.1 Etapas do fluxo

1. **Descoberta:** o backend consulta a lista atual de serviços na Metrics Aggregator API.
2. **Identificação:** cada serviço é cadastrado ou atualizado no PostgreSQL pelo identificador externo.
3. **Coleta:** o backend consulta as métricas individuais do serviço.
4. **Consulta regional:** quando existe código de região, o backend consulta a intensidade de carbono correspondente.
5. **Cálculo:** a calculadora estima potência, energia e emissões de CO₂e.
6. **Persistência:** os dados brutos, o estado da coleta e os resultados disponíveis são gravados no histórico.
7. **Consulta:** o frontend solicita os serviços e os indicadores ao backend.
8. **Apresentação:** a interface exibe as informações recebidas, distinguindo valores disponíveis, estados sem métricas e falhas.

## 7. Cálculo de energia e emissões

O módulo `backend/src/calculos/calculo-energia.ts` reúne as funções responsáveis por calcular potência, energia e emissões.

Os fatores utilizados na estimativa de potência são:

| Recurso | Fator utilizado |
|---|---:|
| CPU a 100% de utilização | 100 W |
| RAM | 0,375 W por GB |
| Disco | 0,01 W por GB |
| Rede | 0,02 W por GB |

A potência estimada é calculada por:

\[
P(W) =
\left(\frac{CPU(\%)}{100} \times 100\right)
+ (RAM(GB) \times 0{,}375)
+ (Disco(GB) \times 0{,}01)
+ (Rede(GB) \times 0{,}02)
\]

A energia estimada é:

\[
E(kWh) = \frac{P(W) \times duração(segundos)}{3.600 \times 1.000}
\]

A emissão estimada é:

\[
CO_2e(g) = E(kWh) \times intensidade(gCO_2e/kWh)
\]

Os resultados são arredondados para oito casas decimais antes de serem persistidos. As fórmulas, unidades e premissas também estão descritas em [`calculos.md`](./calculos.md).

## 8. Modelo de dados

O banco de dados do GreenER utiliza **PostgreSQL**. A definição das tabelas está em `database/schema.sql`, os dados iniciais em `database/seed.sql` e as alterações para bancos já existentes em `database/migrations/`.

O modelo atual possui sete tabelas.

### 8.1 Diagrama entidade-relacionamento

O diagrama abaixo representa as relações definidas no `schema.sql`.

```mermaid
erDiagram
    APLICACOES ||--o{ SERVICOS : agrupa
    REGIOES o|--o{ SERVICOS : localiza
    SERVICOS ||--o{ METRICAS_SERVICO : possui
    USUARIOS o|--o{ LOGS_SISTEMA : registra

    CONFIGURACOES {
        varchar chave PK
        text valor
        varchar descricao
        timestamptz atualizado_em
    }

    REGIOES {
        bigserial id PK
        varchar nome
        varchar pais
        numeric fator_co2e_g_kwh
        varchar unidade
        integer ano_referencia
        text fonte
        timestamptz criado_em
    }

    APLICACOES {
        bigserial id PK
        varchar nome
        text descricao
        timestamptz criado_em
    }

    USUARIOS {
        bigserial id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        timestamptz criado_em
    }

    LOGS_SISTEMA {
        bigserial id PK
        bigint usuario_id FK
        varchar acao
        jsonb detalhes
        timestamptz criado_em
    }

    SERVICOS {
        bigserial id PK
        varchar id_externo UK
        bigint aplicacao_id FK
        bigint regiao_id FK
        varchar nome
        varchar status
        varchar cidade
        numeric latitude
        numeric longitude
        timestamptz criado_em
    }

    METRICAS_SERVICO {
        bigserial id PK
        bigint servico_id FK
        timestamptz coletado_em
        numeric cpu_percentual
        numeric memoria_gb
        numeric disco_gb
        numeric rede_gb
        integer intervalo_segundos
        varchar status_coleta
        numeric potencia_estimada_w
        integer duracao_segundos
        numeric energia_kwh
        numeric emissao_co2e_g
        timestamptz calculado_em
    }
```

### 8.2 Descrição das tabelas

#### `configuracoes`

Armazena configurações gerais no formato chave/valor.

| Campo | Tipo | Descrição |
|---|---|---|
| `chave` | `VARCHAR(100)` | Chave primária da configuração. |
| `valor` | `TEXT` | Valor armazenado. |
| `descricao` | `VARCHAR(255)` | Descrição opcional da configuração. |
| `atualizado_em` | `TIMESTAMPTZ` | Data e hora da atualização. |

O seed inclui a configuração `intervalo_coleta_segundos`, com valor inicial de `60`.

#### `regioes`

Armazena as regiões e os fatores de intensidade de carbono utilizados nas estimativas.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(100)` | Nome da região. |
| `pais` | `VARCHAR(100)` | País da região. |
| `fator_co2e_g_kwh` | `NUMERIC(10,4)` | Fator de emissão em gCO₂e/kWh. |
| `unidade` | `VARCHAR(20)` | Unidade do fator; padrão `gCO2e/kWh`. |
| `ano_referencia` | `INTEGER` | Ano de referência do fator. |
| `fonte` | `TEXT` | Fonte do fator. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

A combinação de `nome` e `pais` é única.

#### `aplicacoes`

Agrupa os serviços monitorados.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(120)` | Nome único da aplicação. |
| `descricao` | `TEXT` | Descrição opcional. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

#### `usuarios`

Armazena os usuários que podem realizar login no sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `nome` | `VARCHAR(100)` | Nome do usuário. |
| `email` | `VARCHAR(150)` | E-mail único utilizado no login. |
| `senha_hash` | `VARCHAR(255)` | Hash da senha, não a senha em texto puro. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

O schema atual não possui colunas de perfil ou status do usuário.

#### `logs_sistema`

Estrutura para registrar ações do sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária. |
| `usuario_id` | `BIGINT` | Referência opcional a `usuarios`. |
| `acao` | `VARCHAR(100)` | Identificação da ação. |
| `detalhes` | `JSONB` | Detalhes adicionais em formato JSON. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora do registro. |

O campo `usuario_id` aceita nulo, permitindo registros sem usuário associado. A tabela está definida no schema; isso não significa que todos os eventos da aplicação já sejam gravados nela.

#### `servicos`

Armazena os serviços monitorados e suas informações de localização.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária interna. |
| `id_externo` | `VARCHAR(100)` | Identificador do serviço na API de métricas; possui índice único. |
| `aplicacao_id` | `BIGINT` | Referência obrigatória a `aplicacoes`. |
| `regiao_id` | `BIGINT` | Referência opcional a `regioes`. |
| `nome` | `VARCHAR(120)` | Nome do serviço. |
| `status` | `VARCHAR(20)` | Estado do serviço: `ativo`, `indisponivel` ou `removido`. |
| `cidade` | `VARCHAR(100)` | Cidade, quando informada. |
| `latitude` | `NUMERIC(10,8)` | Latitude, quando disponível. |
| `longitude` | `NUMERIC(11,8)` | Longitude, quando disponível. |
| `criado_em` | `TIMESTAMPTZ` | Data e hora de criação. |

O identificador externo permite atualizar um cadastro existente sem criar um serviço duplicado. A região e as coordenadas podem ser nulas quando a API não fornece localização.

#### `metricas_servico`

Armazena o histórico de coletas e os resultados calculados disponíveis.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `BIGSERIAL` | Chave primária da coleta. |
| `servico_id` | `BIGINT` | Referência obrigatória a `servicos`. |
| `coletado_em` | `TIMESTAMPTZ` | Data e hora da coleta. |
| `cpu_percentual` | `NUMERIC(5,2)` | Utilização da CPU em percentual. |
| `memoria_gb` | `NUMERIC(14,6)` | Memória em GB. |
| `disco_gb` | `NUMERIC(14,6)` | Disco em GB. |
| `rede_gb` | `NUMERIC(14,6)` | Rede em GB. |
| `intervalo_segundos` | `INTEGER` | Intervalo associado à coleta, em segundos. |
| `status_coleta` | `VARCHAR(20)` | `sucesso`, `sem_metricas` ou `indisponivel`. |
| `potencia_estimada_w` | `NUMERIC(16,8)` | Potência estimada em Watts. |
| `duracao_segundos` | `INTEGER` | Duração utilizada no cálculo, em segundos. |
| `energia_kwh` | `NUMERIC(18,8)` | Energia estimada em kWh. |
| `emissao_co2e_g` | `NUMERIC(18,8)` | Emissão estimada em gramas de CO₂e. |
| `calculado_em` | `TIMESTAMPTZ` | Data e hora do cálculo, quando realizado. |

Os campos de métricas e cálculo aceitam nulo para representar informações que não estavam disponíveis. Cada coleta gera um novo registro, preservando o histórico do serviço.

### 8.3 Relacionamentos

| Origem | Destino | Cardinalidade | Descrição |
|---|---|---|---|
| `aplicacoes` | `servicos` | 1:N | Uma aplicação pode agrupar vários serviços; cada serviço pertence a uma aplicação. |
| `regioes` | `servicos` | 1:N opcional | Uma região pode estar associada a vários serviços; um serviço pode não possuir região informada. |
| `servicos` | `metricas_servico` | 1:N | Um serviço pode possuir várias coletas; cada coleta pertence a um serviço. |
| `usuarios` | `logs_sistema` | 1:N opcional | Um usuário pode estar associado a vários registros; um registro pode não possuir usuário associado. |

A tabela `configuracoes` não possui chave estrangeira no schema atual.

### 8.4 Integridade e restrições

O schema aplica restrições para preservar a integridade dos dados:

- e-mail de usuário, nome de aplicação e identificador externo do serviço possuem unicidade;
- região é identificada pela combinação de nome e país;
- latitude e longitude possuem limites geográficos;
- CPU aceita valores entre 0 e 100;
- memória, disco, rede, potência, duração, energia e emissão não aceitam valores negativos;
- status de serviço e de coleta são limitados aos valores definidos no schema;
- os relacionamentos utilizam chaves estrangeiras para associar serviços, aplicações, regiões, coletas, usuários e logs.

### 8.5 Migrações do banco

Além do `schema.sql`, o repositório contém migrações para atualizar bancos já existentes:

| Arquivo | Objetivo |
|---|---|
| `001_persistencia_coletas.sql` | Adiciona o identificador externo aos serviços, cria sua unicidade e permite intervalo de coleta igual a zero. |
| `002_servico_sem_localizacao.sql` | Permite que `servicos.regiao_id` seja nulo quando a localização não estiver disponível. |

As migrações são destinadas a bancos já criados. Em um banco novo, a estrutura é criada pelo `schema.sql` e os dados iniciais são inseridos pelo `seed.sql`.

## 9. Autenticação e configuração

O módulo `auth/` autentica usuários por e-mail e senha. A senha é verificada a partir do hash armazenado no banco, e o backend emite um JWT assinado com HS256.

Características da implementação atual:

- validade do token: uma hora;
- variável de ambiente: `JWT_SECRET`;
- segredo deve conter pelo menos 32 bytes;
- o token identifica o usuário pelo campo `sub`;
- o middleware valida assinatura, algoritmo, emissor, audiência e expiração;
- `GET /monitoring-settings` exige o cabeçalho `Authorization: Bearer <token>`;
- `POST /auth/login` é uma rota pública.

O schema não possui, neste momento, colunas de perfil e status do usuário. A documentação não deve atribuir permissões por perfil que ainda não estejam implementadas.

## 10. Execução da aplicação

O repositório organiza a execução com Docker Compose, por meio do arquivo `compose.yaml`.

| Serviço | Função | Porta publicada padrão |
|---|---|---|
| `database` | Banco de dados PostgreSQL. | `5432` |
| `backend` | API HTTP, regras de negócio e coletas. | `3000` |
| `frontend` | Aplicação web servida pelo Nginx. | `8080` |

O volume `postgres_data` mantém os dados do PostgreSQL entre reinicializações dos containers. O backend aguarda a disponibilidade do banco antes de iniciar, e o frontend depende da condição de saúde do backend.

As variáveis de ambiente e os comandos de inicialização estão descritos no [README principal](../README.md) e no [README do backend](../backend/README.md).

## 11. Diagramas de referência da Sprint 1

A documentação reaproveita os diagramas criados na Sprint 1 como referência do desenho inicial do sistema:

- [Diagrama de casos de uso](./diagramas/diagrama-casos-de-uso.md)
- [Diagrama de classes](./diagramas/diagrama-classes.md)
- [Diagramas de sequência](./diagramas/diagrama-sequencia.md)

Os diagramas iniciais representam decisões e propostas feitas durante a primeira sprint. Para detalhes da implementação atual, devem prevalecer os caminhos, as rotas e as tabelas descritos neste documento e nos arquivos de código, especialmente `backend/src/app.ts`, `backend/src/modules/` e `database/schema.sql`.

## 12. Referências relacionadas

- [Documentação da API](./api.md)
- [Documentação dos cálculos](./calculos.md)
- [README do banco de dados](../database/README.md)
- [README do backend](../backend/README.md)
- [README do frontend](../frontend/README.md)
- [Schema do banco](../database/schema.sql)
- [Seed do banco](../database/seed.sql)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
