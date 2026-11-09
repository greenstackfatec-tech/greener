# Backend GreenER

O backend do **GreenER** disponibiliza a API HTTP, coordena as regras de negócio e as coletas, integra-se às APIs externas e persiste os dados no PostgreSQL.

Tecnologias principais: **Node.js 22.16.0**, **TypeScript 7.0.2**, **PostgreSQL 18** e `pg`.

## 1. Organização do projeto

O código segue, de forma geral, a separação **routes → controller → service → repository**.

| Diretório / arquivo | Responsabilidade |
|---|---|
| `src/server.ts` | Inicializa o servidor, a rotina de coleta e o encerramento. |
| `src/app.ts` | Reúne as rotas e direciona as requisições. |
| `src/shared/` | Utilitários HTTP compartilhados. |
| `src/db/` | Pool PostgreSQL, consultas e verificação de conexão. |
| `src/integrations/` | Clientes e validações das APIs externas. |
| `src/calculos/` | Cálculos de potência, energia e CO₂e. |
| `src/mocks/` | Dados e servidor de apoio a testes. |
| `src/modules/auth/` | Login, JWT e limite de tentativas. |
| `src/modules/collections/` | Coletas manuais/periódicas, histórico e diagnóstico. |
| `src/modules/configuracoes/` | Consulta de configurações utilizadas pela rotina. |
| `src/modules/dashboard-indicators/` | Indicadores consolidados do dashboard. |
| `src/modules/monitoring-settings/` | Consulta de configurações protegida por JWT. |
| `src/modules/resultados/` | Acesso aos resultados calculados persistidos. |
| `src/modules/services/` | Cadastro e consulta de serviços. |
| `scripts/` | Scripts auxiliares, incluindo verificação de persistência. |

## 2. Pré-requisitos

Para desenvolvimento local:

- Node.js 22.16.0 ou runtime compatível;
- npm;
- PostgreSQL acessível;
- variáveis de conexão com o banco configuradas.

Para iniciar o ambiente completo com Docker, siga o [README principal](../README.md).

## 3. Instalação e execução local

Na raiz do repositório:

```bash
cd backend
npm ci
npm run typecheck
npm start
```

O servidor utiliza `PORT`, com padrão `3000`. Fora do Compose, configure as variáveis `PG*` para apontar a um PostgreSQL acessível. O Node não carrega automaticamente o `.env` da raiz.

### Scripts

| Comando | Finalidade |
|---|---|
| `npm start` | Inicia o servidor HTTP. |
| `npm run mock` | Inicia o servidor local de mocks. |
| `npm run typecheck` | Checagem de tipos TypeScript. |
| `npm test` | Testes locais definidos em `package.json`. |
| `npm run test:integration` | Testes de integração com PostgreSQL. |
| `npm run test:collections:integration` | Testes de integração de coletas e migrações. |
| `npm run test:persistence` | Verificação de persistência com ambiente Docker de teste. |

**Observação:** o `backend/package.json` contém atualmente declarações repetidas para `test` e `test:integration`. Na leitura usual de JSON, prevalece a última ocorrência de cada chave. Recomenda-se consolidar essas entradas para evitar ambiguidade.

## 4. Variáveis de ambiente

No Docker Compose, as variáveis são lidas do `.env` da raiz, criado a partir de `.env.example`.

| Variável | Finalidade | Padrão / observação |
|---|---|---|
| `PORT` | Porta HTTP dentro do container. | `3000` no Compose. |
| `PGHOST` | Host PostgreSQL. | `database` no Compose. |
| `PGPORT` | Porta PostgreSQL. | `5432` no Compose. |
| `PGDATABASE` | Nome do banco. | `greener`. |
| `PGUSER` | Usuário do banco. | `greener`. |
| `PGPASSWORD` | Senha do banco. | `greener_dev_only`, somente desenvolvimento. |
| `PGCONNECT_TIMEOUT` | Tempo limite de conexão, em segundos. | `5`. |
| `PGQUERY_TIMEOUT_MS` | Tempo limite de consulta, em milissegundos. | `10000`. |
| `JWT_SECRET` | Segredo de assinatura e validação JWT. | Obrigatório para autenticação; mínimo de 32 bytes. |
| `METRICS_API_URL` | URL base da API de métricas. | `https://metrics.unilaunch.org`. |
| `CARBON_API_URL` | URL base da API de carbono. | `https://carbon.unilaunch.org`. |
| `API_TIMEOUT_MS` | Timeout das chamadas externas, em ms. | `10000`. |
| `COLLECTIONS_AUTO_START` | Controla início automático da coleta. | `true`; aceita `true` ou `false`. |

Gere um segredo JWT aleatório:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado para `JWT_SECRET` no `.env`. Não versione nem compartilhe esse arquivo. Os valores de desenvolvimento do `.env.example` não devem ser reutilizados em ambientes compartilhados.

## 5. Banco de dados e persistência

O acesso ao PostgreSQL é centralizado em `src/db/connection.ts`. Os arquivos do banco são:

- [`database/schema.sql`](../database/schema.sql): criação das tabelas;
- [`database/seed.sql`](../database/seed.sql): dados iniciais;
- [`database/migrations/`](../database/migrations/): atualizações de bancos existentes.

| Tabela | Finalidade |
|---|---|
| `aplicacoes` | Agrupa serviços. |
| `regioes` | Guarda fatores regionais de intensidade de carbono. |
| `servicos` | Cadastro dos serviços monitorados. |
| `metricas_servico` | Histórico de métricas e resultados calculados. |
| `configuracoes` | Configurações chave/valor. |
| `usuarios` | Usuários e hashes de senha. |
| `logs_sistema` | Estrutura de registro de ações. |

O identificador externo (`id_externo`) permite atualizar um serviço já cadastrado sem duplicá-lo. Cada coleta gera uma nova linha em `metricas_servico`.

Em um volume Docker novo, `schema.sql` e `seed.sql` são executados na inicialização. Em volume existente, consulte o [README do banco](../database/README.md) e aplique as migrações pertinentes. **Não execute novamente `schema.sql` em um banco com dados**, pois ele contém comandos de remoção e recriação de tabelas.

### Coleta manual e consultas

Com o ambiente iniciado:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/collections/executar"
Invoke-RestMethod -Uri "http://localhost:3000/services"
Invoke-RestMethod -Uri "http://localhost:3000/collections"
```

Para consultar o histórico de um serviço específico:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/collections?serviceId=1"
```

Ajuste a porta conforme `BACKEND_PORT` no `.env`.
- **Métricas e cálculo disponíveis:** grava as métricas e os resultados de potência, energia e CO₂e.
- **Falha no cálculo ou na consulta de carbono:** preserva as métricas recebidas, com `status_coleta = 'sucesso'`, e deixa os campos de cálculo e `calculado_em` nulos. O detalhe retorna `resultado: "parcial"` e `falha` com etapa, tipo, código e mensagem; `erro` mantém a mesma mensagem para compatibilidade. O status do banco descreve a obtenção das métricas; o campo `resultado` descreve a operação completa.
- **Métricas ausentes (`500 metrics_missing`):** registra `sem_metricas`, com valores nulos e serviço ativo. Medições iguais a zero continuam válidas.
- **Timeout, erro de rede ou HTTP 500 ao obter métricas:** registra uma coleta `indisponivel`, sem valores de métricas, e atualiza o status do serviço na mesma operação. A próxima coleta com métricas ou `metrics_missing` restaura o estado ativo, preservando o histórico e serviços removidos. Os demais serviços continuam sendo coletados. HTTP 404 apenas é reportado, sem inserir uma coleta.
- **Falha ao gravar no banco:** a rodada retorna HTTP 500 depois de aguardar os demais serviços. Gravações já concluídas permanecem no banco; a rodada inteira não é uma única transação.

## 6. Integrações externas

Os clientes ficam em `src/integrations/` e utilizam `api-client.ts` para timeout, leitura de JSON e validação de respostas.

### 6.1 Greener Metrics Aggregator API

- Documentação: [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs)
- URL base: `https://metrics.unilaunch.org`
- Variável: `METRICS_API_URL`
- Método: `GET`

| Endpoint | Finalidade |
|---|---|
| `/services` | Lista serviços monitorados. |
| `/services/{id}` | Consulta um serviço pelo identificador externo. |
| `/metrics/{id}` | Consulta métricas e intervalo de coleta. |

As métricas utilizadas incluem CPU (%), memória (GB), disco (GB), rede (GB) e `collection_interval_seconds`.

### 6.2 Greener Carbon Intensity API

- Documentação: [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)
- URL base: `https://carbon.unilaunch.org`
- Variável: `CARBON_API_URL`
- Método: `GET`

| Endpoint | Finalidade |
|---|---|
| `/regions` | Lista regiões disponíveis. |
| `/regions/{codigo}` | Consulta uma região. |
| `/regions/{codigo}/carbon-intensity` | Consulta intensidade de carbono regional. |

O backend utiliza `location.region_code`, recebido da API de métricas, para consultar a intensidade de carbono da região.

### 6.3 Tratamento de erros

As integrações classificam falhas como HTTP, timeout, rede ou resposta inválida. Respostas inválidas e dados ausentes não são convertidos em métricas iguais a zero. Quando não há dados suficientes para concluir o cálculo, as métricas recebidas podem ser preservadas e os campos calculados permanecem nulos.

## 7. Rotina periódica

A rotina inicia automaticamente quando o servidor começa a escutar, salvo quando `COLLECTIONS_AUTO_START=false`.

Fluxo principal:

1. Descobrir os serviços na API de métricas.
2. Atualizar os cadastros no PostgreSQL.
3. Consultar as métricas de cada serviço.
4. Obter a intensidade de carbono regional, quando houver código de região.
5. Calcular potência, energia e CO₂e quando houver dados suficientes.
6. Persistir a amostra e o estado da coleta.
7. Programar a próxima execução.

Cada serviço utiliza seu próprio `collection_interval_seconds`, quando válido. O intervalo começa a contar após o término da coleta, incluindo cálculo e persistência. Coletas manuais e automáticas do mesmo serviço aguardam a anterior para evitar sobreposição.

Antes de cada ciclo de coleta, a descoberta compara os IDs externos da API com os serviços persistidos da aplicação monitorada. Serviços novos são cadastrados e passam a ser coletados; ausentes recebem `removido`, preservando o cadastro e o histórico; quando reaparecem, são reativados no mesmo registro e voltam a ser coletados, sem reiniciar a rotina. As mudanças e seus horários de detecção ficam em `logs_sistema`, com as ações `servico_incluido`, `servico_removido` e `servico_reativado`. Uma lista válida vazia confirma a ausência dos serviços monitorados; falhas na listagem não provocam remoções.

O diagnóstico da rotina é mantido em memória e pode ser consultado por `GET /collections/rotina/status`. O histórico das coletas permanece no PostgreSQL após a reinicialização do processo.

Veja os métodos, parâmetros e respostas em [`docs/api.md`](../docs/api.md#controle-da-coleta-periódica-tp06--93).

## 8. Autenticação JWT

`POST /auth/login` recebe e-mail e senha, verifica o hash bcrypt armazenado em `usuarios.senha_hash` e retorna um JWT válido por uma hora.

A rota `GET /monitoring-settings` exige:

```http
Authorization: Bearer <token>
```

O `JWT_SECRET` deve conter pelo menos 32 bytes. Após cinco tentativas incorretas por e-mail em uma janela de cinco minutos, o login retorna HTTP `429` e o cabeçalho `Retry-After`.

A documentação completa dos endpoints e respostas está em [`docs/api.md`](../docs/api.md).

## 9. Endpoints de saúde

| Método | Caminho | Resultado |
|---|---|---|
| `GET` | `/health/live` | HTTP 200 quando o processo HTTP está ativo. |
| `GET` | `/health/ready` | HTTP 200 quando o PostgreSQL responde; HTTP 503 quando indisponível. |

No Compose, o backend aguarda o banco ficar saudável. O frontend encaminha chamadas `/api/` ao backend por meio do Nginx.

## 10. Testes

Na pasta `backend`:

```bash
npm ci
npm run typecheck
npm test
```

Testes que precisam de PostgreSQL:

```bash
npm run test:integration
npm run test:collections:integration
```

Verificação de persistência com ambiente Docker isolado:

```bash
npm run test:persistence
```

A última opção utiliza `scripts/verify-persistence.ts` e `compose.persistence.yaml`. Requer Docker em execução e as portas de teste previstas pelo script disponíveis.

## 11. Documentação relacionada

- [README principal](../README.md)
- [Documentação da API](../docs/api.md)
- [Arquitetura e modelo de dados](../docs/arquitetura.md)
- [Metodologia dos cálculos](../docs/calculos.md)
- [README do banco de dados](../database/README.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
