# Backend GreenER

O backend do **GreenER** disponibiliza a API HTTP, coordena as regras de negócio e as coletas, integra-se às APIs externas, calcula estimativas de energia e CO₂e e persiste os dados no PostgreSQL.

No container, o backend utiliza **Node.js 22 Alpine**. O projeto utiliza **TypeScript 6.0.3**, PostgreSQL 18 e o driver `pg`.

## 1. Organização do projeto

O código segue, de forma geral, a separação **routes → controller → service → repository**.

| Diretório / arquivo | Responsabilidade |
|---|---|
| `src/server.ts` | Inicializa o servidor HTTP, inicia a rotina automática e encerra recursos. |
| `src/app.ts` | Reúne as rotas, trata health checks e direciona requisições. |
| `src/shared/` | Utilitários HTTP compartilhados. |
| `src/db/` | Pool PostgreSQL, consultas e verificação de conexão. |
| `src/integrations/` | Clientes e validações das APIs externas. |
| `src/calculos/` | Cálculos de potência, energia e CO₂e. |
| `src/mocks/` | Servidor HTTP e fixtures para simular as APIs externas. |
| `src/modules/analytics/` | Consultas de histórico, ranking e comparação por período. |
| `src/modules/auth/` | Cadastro, login, JWT, middleware de autenticação e limite de tentativas. |
| `src/modules/collections/` | Descoberta, coleta manual/periódica, histórico e diagnóstico da rotina. |
| `src/modules/configuracoes/` | Leitura de configurações utilizadas pela rotina. |
| `src/modules/dashboard-indicators/` | Indicadores consolidados do dashboard. |
| `src/modules/monitoring-settings/` | Consulta autenticada das configurações de monitoramento. |
| `src/modules/resultados/` | Acesso aos resultados calculados persistidos. |
| `src/modules/services/` | Cadastro, consulta e sincronização dos serviços monitorados. |
| `scripts/` | Scripts auxiliares, incluindo verificação de persistência. |

<br>

## 2. Pré-requisitos

Para desenvolvimento local:

- Node.js 22 ou runtime compatível com `--experimental-strip-types`;
- npm;
- PostgreSQL acessível;
- variáveis de conexão com o banco configuradas.

Para iniciar o ambiente completo com Docker Compose, siga o [README principal](../README.md).

O container do backend utiliza a imagem `node:22-alpine`.

<br>


## 3. Instalação e execução local

Na raiz do repositório:

```bash
cd backend
npm ci
npm run typecheck
npm start
```

O servidor utiliza a variável `PORT`, com padrão `3000`.

Fora do Docker Compose, configure as variáveis `PG*` para apontar a um PostgreSQL acessível. O Node não carrega automaticamente o `.env` da raiz; configure as variáveis no terminal ou utilize uma ferramenta apropriada para carregá-las.

### 3.1 Scripts disponíveis

Execute na pasta `backend`:

| Comando | Finalidade |
|---|---|
| `npm start` | Inicia o servidor HTTP. |
| `npm run mock` | Inicia o servidor local que simula as APIs externas na porta 4010. |
| `npm run typecheck` | Executa a checagem de tipos TypeScript. |
| `npm run lint` | Executa o ESLint. |
| `npm test` | Executa testes locais de integrações, mocks, cálculos, autenticação, coletas, serviços, analytics e servidor. |
| `npm run test:integration` | Executa testes de integração que utilizam PostgreSQL. |
| `npm run test:analytics:integration` | Executa testes de integração do módulo de analytics. |
| `npm run test:collections:integration` | Executa testes de integração de coletas, migrações e conexão. |
| `npm run test:persistence` | Executa o script de verificação de persistência. |

Os testes de integração precisam de um PostgreSQL configurado. O teste de persistência utiliza o ambiente Docker de teste definido no repositório e requer Docker em execução.

<br>


## 4. Variáveis de ambiente

No Docker Compose, as variáveis são lidas do `.env` da raiz, criado a partir de `.env.example`.

| Variável | Finalidade | Padrão / observação |
|---|---|---|
| `PORT` | Porta HTTP dentro do container. | `3000`. |
| `PGHOST` | Host PostgreSQL. | `database` no Compose. |
| `PGPORT` | Porta PostgreSQL. | `5432`. |
| `PGDATABASE` | Nome do banco. | `greener`. |
| `PGUSER` | Usuário do banco. | `greener`. |
| `PGPASSWORD` | Senha do banco. | `greener_dev_only` no exemplo local; substitua fora do desenvolvimento. |
| `PGCONNECT_TIMEOUT` | Tempo limite de conexão, em segundos. | `5`. |
| `PGQUERY_TIMEOUT_MS` | Tempo limite de consulta, em milissegundos. | `10000`. |
| `JWT_SECRET` | Segredo de assinatura e validação JWT. | Obrigatório para autenticação; mínimo de 32 bytes. |
| `METRICS_API_URL` | URL base da API de métricas. | `https://metrics.unilaunch.org`. |
| `CARBON_API_URL` | URL base da API de carbono. | `https://carbon.unilaunch.org`. |
| `API_TIMEOUT_MS` | Timeout das chamadas externas, em milissegundos. | `10000`. |
| `COLLECTIONS_AUTO_START` | Controla o início automático da coleta. | `true`; aceita `true` ou `false`. |

O `.env.example` contém um segredo JWT para desenvolvimento local. Fora desse ambiente, gere um segredo próprio:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copie o valor gerado para `JWT_SECRET` no `.env`. Não versione nem compartilhe esse arquivo.

<br>


## 5. Banco de dados e persistência

O acesso ao PostgreSQL é centralizado em `src/db/connection.ts`.

- [`database/schema.sql`](../database/schema.sql): definição das tabelas.
- [`database/seed.sql`](../database/seed.sql): dados iniciais.
- [`database/migrations/`](../database/migrations/): alterações para bancos existentes.

| Tabela | Finalidade |
|---|---|
| `aplicacoes` | Agrupa serviços. |
| `regioes` | Guarda fatores regionais de intensidade de carbono. |
| `servicos` | Cadastro dos serviços monitorados. |
| `metricas_servico` | Histórico de métricas e resultados calculados. |
| `configuracoes` | Configurações chave/valor, incluindo o intervalo de coleta. |
| `usuarios` | Usuários e hashes de senha. |
| `logs_sistema` | Estrutura para registro de ações do sistema. |

O identificador externo (`id_externo`) permite atualizar um serviço já cadastrado sem duplicá-lo. Cada coleta gera uma nova linha em `metricas_servico`.

Em um volume Docker novo, `schema.sql` e `seed.sql` são executados na inicialização. Em volume existente, consulte o [README do banco](../database/README.md) e aplique as migrações pertinentes. **Não execute novamente `schema.sql` em um banco com dados**, pois ele contém comandos de remoção e recriação de tabelas.

### 5.1 Coleta manual e consultas

As rotas de serviços e coletas exigem JWT. Obtenha um token em `POST /auth/login` e substitua o valor abaixo:

```powershell
$headersAutenticacao = @{ Authorization = "Bearer <token_obtido_no_login>" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/collections/executar" -Headers $headersAutenticacao
Invoke-RestMethod -Uri "http://localhost:3000/services" -Headers $headersAutenticacao
Invoke-RestMethod -Uri "http://localhost:3000/collections" -Headers $headersAutenticacao
```

Para consultar o histórico detalhado de um serviço:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/collections?serviceId=1" -Headers $headersAutenticacao
```

A porta publicada no computador pode ser alterada com `BACKEND_PORT` no `.env`; a porta interna do container permanece `3000`.

### 5.2 Estados e persistência das coletas

- **Métricas e cálculo disponíveis:** grava métricas e resultados de potência, energia e CO₂e.
- **Falha no cálculo ou na consulta de carbono:** preserva as métricas recebidas com `status_coleta = 'sucesso'`, mas deixa os campos calculados e `calculado_em` nulos. O resultado completo da operação é marcado como parcial.
- **Métricas ausentes (`500 metrics_missing`):** registra `sem_metricas`, com campos de métrica nulos, e mantém o serviço ativo. Medições válidas iguais a zero continuam sendo sucesso.
- **Timeout, erro de rede ou HTTP 500 na consulta de métricas:** registra coleta `indisponivel`, sem valores de métricas, e atualiza o estado do serviço.
- **Serviço que reaparece:** uma coleta válida posterior reativa o serviço, preservando o cadastro e o histórico.
- **Falha ao gravar no banco:** a rodada retorna erro interno depois de aguardar os demais serviços. Gravações já concluídas permanecem persistidas; a rodada inteira não é uma única transação.

Uma resposta HTTP 404 da API externa é reportada e não é tratada como indisponibilidade transitória com gravação de uma nova observação.

<br>


## 6. Endpoints do backend

### 6.1 Saúde

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/health/live` | Público | Verifica se o processo HTTP está em execução. |
| GET | `/health/ready` | Público | Verifica a disponibilidade do PostgreSQL. |

### 6.2 Autenticação

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| POST | `/auth/register` | Público | Cria usuário com nome, e-mail e senha. |
| POST | `/auth/login` | Público | Valida credenciais e retorna JWT. |

O cadastro persiste apenas nome, e-mail e hash bcrypt da senha. Os campos `tipoPessoa` e `documento` enviados pelo frontend ainda são ignorados pelo backend, sem validação ou persistência de CPF/CNPJ.

O JWT utiliza HS256, tem validade de uma hora e exige `JWT_SECRET` com pelo menos 32 bytes. O middleware valida o token antes de executar as rotas privadas.

O limitador de login permite até cinco tentativas incorretas por e-mail em uma janela de cinco minutos. Quando o limite é atingido, o backend retorna HTTP `429` e `Retry-After`. O estado desse limitador é mantido em memória pelo processo.

Não existe endpoint de logout/revogação: o logout do produto remove o token no frontend, e o token emitido continua válido até expirar.

### 6.3 Serviços, coletas e indicadores

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/services` | JWT | Lista serviços, localização, estado e dados da última coleta. |
| GET | `/services/:id` | JWT | Consulta um serviço por ID interno. |
| GET | `/collections` | JWT | Lista as últimas coletas. |
| GET | `/collections?serviceId=:id` | JWT | Lista as coletas detalhadas de um serviço. |
| POST | `/collections/executar` | JWT | Executa uma rodada manual de coleta. |
| POST | `/collections/rotina/iniciar` | JWT | Inicia a rotina periódica. |
| POST | `/collections/rotina/parar` | JWT | Para a rotina e aguarda coletas pendentes. |
| GET | `/collections/rotina/status` | JWT | Consulta o estado e o diagnóstico da rotina. |
| GET | `/dashboard/indicadores` | JWT | Retorna consumo, emissão, contagens, última coleta e intervalo. |

### 6.4 Análises

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/analytics/historico/:servicoId` | JWT | Consulta histórico de um serviço no período. |
| GET | `/analytics/ranking` | JWT | Ranking por energia ou CO₂e, com agregação simples ou detalhada. |
| GET | `/analytics/comparacao` | JWT | Compara de dois a cinco serviços no mesmo período. |

As três rotas exigem os parâmetros de período `inicio` e `fim` em ISO 8601. O ranking aceita métrica, ordenação, filtros de aplicação/região, paginação e, quando informado, `agregacao=total` ou `agregacao=media`.

### 6.5 Configurações de monitoramento

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/monitoring-settings` | JWT | Consulta o intervalo salvo em `configuracoes`. |

Os contratos completos, parâmetros, respostas e códigos de erro estão em [`docs/api.md`](../docs/api.md).

<br>


## 7. Integrações externas

Os clientes ficam em `src/integrations/` e utilizam `api-client.ts` para timeout, leitura de JSON e validação de respostas.

### 7.1 Greener Metrics Aggregator API

- Documentação: [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs)
- URL base: `https://metrics.unilaunch.org`
- Variável: `METRICS_API_URL`
- Método: GET

| Endpoint | Finalidade |
|---|---|
| `/services` | Lista serviços monitorados e informações de localização. |
| `/services/{id}` | Consulta um serviço pelo identificador externo. |
| `/metrics/{id}` | Consulta métricas e duração da amostra. |

As métricas utilizadas incluem CPU (%), memória (GB), disco (GB), rede (GB) e `collection_interval_seconds`.

### 7.2 Greener Carbon Intensity API

- Documentação: [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)
- URL base: `https://carbon.unilaunch.org`
- Variável: `CARBON_API_URL`
- Método: GET

| Endpoint | Finalidade |
|---|---|
| `/regions` | Lista regiões disponíveis. |
| `/regions/{codigo}` | Consulta uma região. |
| `/regions/{codigo}/carbon-intensity` | Consulta intensidade de carbono regional. |

O backend utiliza `location.region_code`, recebido da API de métricas, para consultar a intensidade de carbono da região.

### 7.3 Tratamento de erros

As integrações classificam falhas como HTTP, timeout, rede ou resposta inválida. O timeout padrão é de 10.000 ms e pode ser ajustado por `API_TIMEOUT_MS`.

Respostas inválidas e dados ausentes não são convertidos em métricas iguais a zero. Se as métricas forem recebidas, mas o cálculo não puder ser concluído, os campos calculados permanecem nulos.

A rotina não executa múltiplas tentativas imediatas para a mesma chamada. Após uma falha, uma nova tentativa pode ocorrer em um ciclo posterior.

<br>


## 8. Rotina periódica

A rotina inicia automaticamente quando o servidor começa a escutar, salvo quando `COLLECTIONS_AUTO_START=false`.

Fluxo principal:

1. Descobrir serviços na API de métricas.
2. Atualizar cadastros e presença dos serviços no PostgreSQL.
3. Consultar métricas individuais.
4. Consultar a intensidade de carbono regional, quando há `region_code`.
5. Calcular potência, energia e CO₂e quando há dados suficientes.
6. Persistir a observação e o status da coleta.
7. Agendar a próxima execução.

**Há dois intervalos diferentes:**

- `intervalo_coleta_segundos`: intervalo de agendamento da rotina, persistido na tabela `configuracoes` (60 segundos no seed).
- `collection_interval_seconds`: duração da amostra enviada pela API de métricas, utilizada no cálculo de energia e gravada no histórico.

O scheduler utiliza o intervalo persistido pela aplicação para programar a próxima execução; não substitui esse valor pela duração da amostra externa. As coletas de um mesmo serviço não se sobrepõem. Serviços diferentes podem ser processados em paralelo.

A rotina sincroniza a lista de serviços: novos IDs externos são cadastrados; serviços ausentes de uma descoberta válida são marcados como removidos, sem apagar o histórico; serviços que reaparecem são reativados. Uma falha ao consultar a lista não deve provocar remoção em massa.

O diagnóstico em memória pode ser consultado por `GET /collections/rotina/status`. O histórico das coletas permanece no PostgreSQL após reinicializações.

<br>

## 9. Mocks das APIs externas

O diretório `src/mocks/` contém um servidor local com fixtures e cenários para a Metrics Aggregator API e a Carbon Intensity API.

Na pasta `backend`:

```bash
npm run mock
```

O servidor fica em `http://127.0.0.1:4010`. A variável `MOCK_PORT` permite alterar a porta.

Para direcionar o backend ao mock, configure antes de iniciá-lo:

```powershell
$env:METRICS_API_URL = "http://127.0.0.1:4010"
$env:CARBON_API_URL = "http://127.0.0.1:4010"
```

Cenários disponíveis: `normal`, `servico-fora-do-ar`, `sem-metricas` e `sem-localizacao`. Os detalhes estão em [`docs/mocks.md`](../docs/mocks.md).

## 10. Testes

Na pasta `backend`:

```bash
npm ci
npm run typecheck
npm run lint
npm test
```

Para testes que utilizam PostgreSQL:

```bash
npm run test:integration
npm run test:analytics:integration
npm run test:collections:integration
```

Verificação de persistência:

```bash
npm run test:persistence
```

O script de persistência utiliza `scripts/verify-persistence.ts` e o ambiente definido em `compose.persistence.yaml`. Requer Docker em execução e as portas de teste disponíveis.

<br>

## 11. Documentação relacionada

- [README principal](../README.md)
- [Índice da documentação](../docs/README.md)
- [Documentação da API](../docs/api.md)
- [Arquitetura e modelo de dados](../docs/arquitetura.md)
- [Metodologia dos cálculos](../docs/calculos.md)
- [Mocks locais](../docs/mocks.md)
- [README do banco de dados](../database/README.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
