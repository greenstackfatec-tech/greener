# 🔌 Documentação da API do GreenER

## 1. Introdução

A API do **GreenER** é responsável por disponibilizar os serviços monitorados, consultar o histórico de coletas, controlar a rotina de monitoramento, autenticar usuários e fornecer indicadores ambientais consolidados. O backend também integra duas APIs externas: uma para obter métricas de infraestrutura e outra para consultar a intensidade de carbono da região do serviço.

Esta documentação descreve os endpoints identificados na implementação do backend. Os exemplos de resposta são ilustrativos e utilizam dados fictícios apenas para demonstrar o formato dos objetos.

## 2. Configuração e acesso

### URL base

Durante a execução local com Docker Compose, o backend fica disponível em:

```text
http://localhost:3000
```

As chamadas feitas pelo frontend passam pelo proxy `/api`, por exemplo `GET http://localhost:8080/api/services`.

### Formato das requisições

- As respostas da API são fornecidas em JSON.
- Requisições com corpo JSON devem utilizar `Content-Type: application/json`.
- Os identificadores internos de serviços são números inteiros positivos.
- Os endpoints públicos não exigem autenticação.
- `GET /monitoring-settings` exige um token JWT válido no cabeçalho `Authorization`.

### Autenticação JWT

A autenticação é realizada por `POST /auth/login`. Em caso de sucesso, a API retorna um token JWT com validade de uma hora. Para acessar endpoints protegidos, envie:

```http
Authorization: Bearer <token>
```

O backend utiliza a variável `JWT_SECRET` para assinar e validar os tokens. Ela deve conter pelo menos 32 bytes e ser definida no arquivo `.env`, criado a partir de `.env.example`. Não compartilhe nem versione o arquivo `.env`.

## 3. Endpoints do backend

### 3.1. Saúde e disponibilidade

#### `GET /health/live`

Verifica se o processo HTTP do backend está em execução. Não depende de uma consulta ao banco de dados.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:**

```json
{
  "status": "ok"
}
```

#### `GET /health/ready`

Verifica se o backend consegue executar uma consulta no PostgreSQL. É utilizado para verificar se a aplicação está pronta para atender às requisições que dependem do banco.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:**

```json
{
  "status": "ok",
  "database": "connected"
}
```

**Banco indisponível — HTTP 503:**

```json
{
  "status": "not_ready",
  "database": "unavailable"
}
```

### 3.2. Serviços monitorados

#### `GET /services`

Retorna os serviços cadastrados no GreenER, incluindo seus dados de identificação e localização disponíveis. A listagem é utilizada pelo dashboard para apresentar os serviços monitorados.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:** array de serviços. A implementação inclui os dados de localização disponíveis e um objeto `localizacao` com valores de apresentação. Quando a origem não informa a localização, os campos estruturados podem ser `null` e os campos de apresentação recebem `"não informado"`.

```json
[
  {
    "id": 1,
    "nome": "Billing API",
    "status": "ativo",
    "cidade": "São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "pais": "Brasil",
    "regiao": "Sudeste",
    "localizacao": {
      "pais": "Brasil",
      "regiao": "Sudeste",
      "cidade": "São Paulo"
    }
  }
]
```

Os estados de serviço persistidos são `ativo`, `indisponivel` e `removido`. A rota atual não inclui as métricas da última coleta, nem os valores de energia e CO₂e. Esses campos ainda não são enviados por `GET /services` na implementação documentada.

#### `GET /services/{id}`

Retorna os dados de um serviço específico, identificado pelo ID interno do banco de dados.

**Parâmetro de caminho:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | Inteiro positivo | Sim | Identificador interno do serviço. |

**Autenticação:** não exige.

**Exemplo de requisição:**

```http
GET /services/1
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "id": 1,
  "nome": "Billing API",
  "status": "ativo",
  "cidade": "São Paulo",
  "latitude": -23.5505,
  "longitude": -46.6333
}
```

**ID inválido — HTTP 400:**

```json
{
  "error": "invalid_id",
  "message": "O id do serviço deve ser um número inteiro positivo."
}
```

**Serviço não encontrado — HTTP 404:**

```json
{
  "error": "not_found",
  "message": "Serviço não encontrado."
}
```

### 3.3. Histórico de coletas

#### `GET /collections`

Retorna as últimas 100 coletas registradas no banco de dados, ordenadas da mais recente para a mais antiga.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:**

```json
[
  {
    "id": 25,
    "servicoId": 1,
    "coletadoEm": "2026-11-06T12:00:00.000Z",
    "statusColeta": "sucesso"
  }
]
```

**Estados de coleta:**

| Estado | Significado |
|---|---|
| `sucesso` | As métricas foram recebidas. O cálculo pode estar disponível ou pode ter sido registrado como resultado parcial. |
| `sem_metricas` | O serviço respondeu, mas não apresentou valores de métricas diferentes de zero. |
| `indisponivel` | Não foi possível obter as métricas do serviço. |

#### `GET /collections?serviceId={id}`

Retorna o histórico detalhado de coletas de um serviço específico. O resultado é limitado às 100 coletas mais recentes daquele serviço.

**Parâmetro de consulta:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `serviceId` | Inteiro positivo | Sim, para filtrar | ID interno do serviço no banco de dados. |

**Autenticação:** não exige.

**Exemplo de requisição:**

```http
GET /collections?serviceId=1
```

**Resposta de sucesso — HTTP 200:**

```json
[
  {
    "id": 25,
    "coletadoEm": "2026-11-06T12:00:00.000Z",
    "cpuPercentual": 42.5,
    "memoriaGb": 2.0,
    "discoGb": 10.25,
    "redeGb": 0.5,
    "intervaloSegundos": 60,
    "statusColeta": "sucesso",
    "potenciaEstimadaW": 43.375,
    "duracaoSegundos": 60,
    "energiaKwh": 0.000723,
    "emissaoCo2eG": 0.0441,
    "calculadoEm": "2026-11-06T12:00:01.000Z"
  }
]
```

Quando ainda não existem coletas para o serviço, a resposta é um array vazio (`[]`). Valores de métricas ou cálculo podem ser `null` conforme o estado da coleta e a disponibilidade do cálculo.

**ID inválido — HTTP 400:**

```json
{
  "error": "invalid_id",
  "message": "serviceId deve ser um número inteiro positivo."
}
```

### 3.4. Execução de coleta

#### `POST /collections/executar`

Executa manualmente uma rodada de coleta. O backend consulta a lista de serviços na API de métricas, solicita as métricas de cada serviço, tenta calcular energia e emissões de CO₂e e persiste os resultados disponíveis.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Corpo da requisição:** não é necessário.

**Resposta — HTTP 200:** a propriedade `resultado` informa o resultado geral da rodada:

- `completo`: todos os serviços foram processados com cálculo completo, ou a API não retornou serviços.
- `parcial`: a rodada foi concluída, mas houve serviços sem métricas, indisponíveis ou sem cálculo completo.
- `falha`: todos os serviços retornaram indisponíveis.

```json
{
  "sucesso": false,
  "resultado": "parcial",
  "mensagem": "Rodada concluída com resultados parciais.",
  "dados": {
    "coletadoEm": "2026-11-06T12:00:00.000Z",
    "totalServicos": 1,
    "sucessos": 0,
    "parciais": 1,
    "semMetricas": 0,
    "indisponiveis": 0,
    "erros": 1,
    "detalhes": [
      {
        "servicoId": 1,
        "servicoNome": "Billing API",
        "status": "sucesso",
        "resultado": "parcial",
        "intervaloSegundos": 60,
        "falha": {
          "etapa": "carbono",
          "idExterno": "servico-1",
          "servicoId": 1,
          "servicoNome": "Billing API",
          "tipo": "timeout",
          "codigo": "API_CARBONO_TIMEOUT",
          "mensagem": "Métricas recebidas; cálculo de energia e CO₂e indisponível nesta coleta.",
          "ocorridoEm": "2026-11-06T12:00:01.000Z"
        },
        "erro": "Métricas recebidas; cálculo de energia e CO₂e indisponível nesta coleta."
      }
    ]
  }
}
```

A lista `dados.detalhes` contém o resultado individual de cada serviço processado. A execução aguarda as operações iniciadas antes de retornar; uma falha de um serviço não impede, por si só, o processamento dos demais.

**Possíveis erros:**

| HTTP | Código | Descrição |
|---|---|---|
| `502` | `external_api_failure` | Falha externa ao consultar a lista de serviços. |
| `504` | `external_api_timeout` | A API externa excedeu o tempo limite ao consultar a lista de serviços. |
| `500` | `internal_error` | Erro interno, de configuração ou persistência. |

Exemplo de resposta de erro:

```json
{
  "sucesso": false,
  "resultado": "falha",
  "error": "external_api_timeout",
  "message": "Não foi possível atualizar a lista de serviços no tempo esperado.",
  "mensagem": "Não foi possível atualizar a lista de serviços no tempo esperado.",
  "erro": "Não foi possível atualizar a lista de serviços no tempo esperado."
}
```

### 3.5. Controle da rotina de coleta periódica

A rotina de coleta é iniciada automaticamente quando o servidor HTTP sobe, exceto quando `COLLECTIONS_AUTO_START=false`. Cada serviço utiliza o intervalo informado pela API de métricas, com intervalo alternativo local quando necessário.

#### `POST /collections/rotina/iniciar`

Inicia manualmente a rotina de coleta periódica.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Cabeçalho obrigatório:** `Content-Type: application/json`.

**Corpo opcional:**

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `intervaloSegundos` | Inteiro | Não | De 1 até 2.147.483 segundos. Define o intervalo alternativo local e de descoberta; o intervalo informado pela API de métricas tem prioridade para cada serviço. |

**Exemplo de requisição:**

```http
POST /collections/rotina/iniciar
Content-Type: application/json
```

```json
{
  "intervaloSegundos": 60
}
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "sucesso": true,
  "mensagem": "Rotina iniciada; cada serviço usa o intervalo informado pela API",
  "dados": {
    "intervaloSegundos": 60,
    "executando": true,
    "encerrando": false,
    "coletasEmAndamento": 0,
    "intervaloAlternativoSegundos": 60
  }
}
```

**Erros possíveis:** HTTP `400` para intervalo inválido ou rotina já iniciada/em encerramento; HTTP `415` quando o cabeçalho não indica JSON; HTTP `500` em falha interna.

#### `POST /collections/rotina/parar`

Solicita a parada da rotina, cancela os agendamentos e aguarda as coletas já iniciadas terminarem.

**Parâmetros e corpo:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:**

```json
{
  "sucesso": true,
  "mensagem": "Rotina de coleta parada com sucesso"
}
```

Se não existir rotina em execução, retorna HTTP `400`. Falhas internas durante o encerramento retornam HTTP `500`.

#### `GET /collections/rotina/status`

Retorna o estado atual da rotina e o diagnóstico das coletas. A resposta é um retrato mantido em memória pelo processo e não dispara uma nova coleta.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Cabeçalho de resposta:** `Cache-Control: no-store`.

**Resposta de sucesso — HTTP 200:**

```json
{
  "sucesso": true,
  "dados": {
    "executando": true,
    "encerrando": false,
    "coletasEmAndamento": 1,
    "intervaloAlternativoSegundos": 60,
    "monitoramento": {
      "situacao": "ok",
      "iniciadoEm": "2026-11-06T11:00:00.000Z",
      "ultimaTentativaDescobertaEm": "2026-11-06T12:00:00.000Z",
      "ultimaDescobertaValidaEm": "2026-11-06T12:00:00.100Z",
      "ultimaTentativaColetaEm": "2026-11-06T12:00:01.000Z",
      "ultimaColetaCompletaEm": "2026-11-06T12:00:02.000Z",
      "falhasAtivas": []
    }
  }
}
```

Os estados de `monitoramento.situacao` são `aguardando`, `ok` e `degradado`. Em `degradado`, `falhasAtivas` lista as falhas ainda não resolvidas, com etapa, tipo, código, mensagem e horário; pode incluir o ID externo e o ID/nome interno do serviço quando disponíveis. O diagnóstico em memória é reiniciado quando o processo do backend é reiniciado.

### 3.6. Autenticação

#### `POST /auth/login`

Valida as credenciais do usuário e emite um token JWT.

**Parâmetros:** nenhum.

**Autenticação:** não exige token.

**Cabeçalho obrigatório:** `Content-Type: application/json`.

**Corpo da requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `email` | Texto | Sim | E-mail cadastrado do usuário. |
| `senha` | Texto | Sim | Senha do usuário. |

**Exemplo de requisição:**

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "usuario@exemplo.com",
  "senha": "senha-do-usuario"
}
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "token": "<JWT>"
}
```

O token expira em uma hora. A resposta utiliza `Cache-Control: no-store`.

**Erros possíveis:**

| HTTP | Código | Descrição |
|---|---|---|
| `400` | `invalid_json` | O corpo não contém JSON válido. |
| `400` | `invalid_request` | E-mail ou senha ausentes ou inválidos. |
| `401` | `invalid_credentials` | E-mail ou senha incorretos. |
| `413` | `payload_too_large` | Corpo maior que 8 KB. |
| `415` | `unsupported_media_type` | Cabeçalho `Content-Type` diferente de `application/json`. |
| `429` | `too_many_requests` | Mais de cinco tentativas incorretas para o mesmo e-mail na janela de cinco minutos. |
| `500` | `internal_server_error` | Erro interno, por exemplo indisponibilidade do banco ou configuração JWT inválida. |

Quando o login retorna `429`, a resposta inclui o cabeçalho `Retry-After`, em segundos. O limitador é mantido em memória por processo.

#### `GET /monitoring-settings`

Retorna a configuração atual do intervalo alternativo de coleta.

**Parâmetros:** nenhum.

**Autenticação:** obrigatória. Enviar `Authorization: Bearer <token>`.

**Resposta de sucesso — HTTP 200:**

```json
{
  "intervaloColetaSegundos": 60
}
```

**Token ausente ou inválido — HTTP 401:**
- `POST /collections/executar`: executa uma rodada manual e retorna o resumo em `dados`. HTTP `200` inclui `resultado: "completo"`, `"parcial"` ou `"falha"`; `sucesso` é verdadeiro somente no resultado completo. `dados.sucessos` conta cálculos completos e `dados.parciais` conta métricas recebidas sem cálculo; detalhes com falha incluem `falha` e a mensagem compatível em `erro`. Chamadas concorrentes aguardam a coleta anterior do mesmo serviço e produzem novas amostras. Descoberta com timeout responde `504`; rede, HTTP externo ou resposta inválida respondem `502`. Configuração e persistência respondem `500`, com `{ error, message }` público controlado, após aguardar os serviços iniciados.
- `POST /collections/rotina/iniciar`: exige `Content-Type: application/json`, com `{}` ou `{ "intervaloSegundos": 60 }`. O campo opcional deve ser um número inteiro entre 1 e 2147483 e substitui apenas o intervalo alternativo e de descoberta; a API mantém prioridade. Responde `200` com o estado da rotina e preserva `dados.intervaloSegundos`, equivalente a `dados.intervaloAlternativoSegundos`; `400` para JSON/intervalo inválido ou rotina já ativa/em encerramento; `415` sem o Content-Type adequado.
- `POST /collections/rotina/parar`: cancela os timers e aguarda as coletas pendentes antes de responder `200`; responde `400` se a rotina já estiver parada. Uma nova chamada de início só é aceita após terminar a parada.
- `GET /collections/rotina/status`: responde `200` com `sucesso: true` e os campos `executando`, `encerrando`, `coletasEmAndamento`, `intervaloAlternativoSegundos` e `monitoramento` em `dados`. `executando` indica rotina ativa, inclusive aguardando o próximo disparo. `monitoramento` informa `situacao` (`aguardando`, `ok` ou `degradado`), horários de tentativa/sucesso e `falhasAtivas` por etapa e ID externo. É um retrato em memória, reiniciado com o processo, sem disparar consultas externas ou gravar amostras; usa `Cache-Control: no-store`.
- `GET /collections`: retorna as últimas 100 coletas persistidas. Cada amostra acrescenta uma linha; a anterior permanece no histórico.

```json
{
  "error": "unauthorized",
  "message": "Token ausente ou inválido."
}
```

A implementação atual disponibiliza somente `GET /monitoring-settings`. Não há rota `PUT` registrada para alterar essa configuração pela API.

### 3.7. Indicadores do dashboard

#### `GET /dashboard/indicadores`

Retorna os indicadores consolidados utilizados no dashboard. Os totais de energia e emissões consideram a última coleta bem-sucedida com cálculo disponível de cada serviço. As contagens consideram os serviços com estado `ativo` e `indisponivel`; serviços removidos não entram nessas duas contagens.

**Parâmetros:** nenhum.

**Autenticação:** não exige.

**Resposta de sucesso — HTTP 200:**

```json
{
  "consumo_total_kwh": 0.32345678,
  "emissao_total_co2e_g": 1.25,
  "servicos_ativos": 2,
  "servicos_indisponiveis": 1
}
```

Quando o banco não contém serviços ou coletas calculadas, os totais são retornados como `0`.

**Erro interno — HTTP 500:**

```json
{
  "error": "internal_error"
}
```

## 4. Integrações com APIs externas

As integrações são realizadas pelo backend. Elas não são endpoints próprios do GreenER e não são expostas como rotas públicas do backend. As chamadas utilizam o método `GET` e o cabeçalho `Accept: application/json`, sem envio de token ou credenciais.

### 4.1. API de métricas

Implementação: `backend/src/integrations/metrics-api.ts`.

- Documentação externa: [Greener Metrics Aggregator API](https://metrics.unilaunch.org/docs)
- URL base padrão: `https://metrics.unilaunch.org`
- Variável de ambiente: `METRICS_API_URL`

| Endpoint externo | Função utilizada | Descrição |
|---|---|---|
| `GET /services` | `listarServicos()` | Lista os serviços disponíveis para monitoramento. |
| `GET /services/{id}` | `buscarServico(id)` | Consulta um serviço pelo identificador externo. |
| `GET /metrics/{id}` | `buscarMetricas(id)` | Consulta o intervalo e as métricas de infraestrutura de um serviço. |

O `id` externo deve ser um texto não vazio e diferente de `.` ou `..`; ele é codificado como segmento de URL antes da requisição.

**Formato de serviço recebido:**

```json
{
  "id": "servico-1",
  "name": "Billing API",
  "location": {
    "region_code": "BR-SE",
    "country": "Brasil",
    "region": "Sudeste",
    "city": "São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "metrics_path": "/metrics/servico-1"
}
```

Os campos de localização podem ser nulos ou estar ausentes na resposta original; nesses casos, a integração normaliza a localização como campos nulos.

**Formato de métricas recebido:**

```json
{
  "collection_interval_seconds": 60,
  "metrics": {
    "cpu_percent": 42.5,
    "memory_gb": 2.0,
    "disk_gb": 10.25,
    "network_gb": 0.5
  }
}
```

Validações realizadas: `collection_interval_seconds` deve ser inteiro seguro maior ou igual a zero; CPU deve estar entre 0 e 100; memória, disco e rede devem ser números finitos não negativos.

### 4.2. API de intensidade de carbono

Implementação: `backend/src/integrations/carbon-api.ts`.

- Documentação externa: [Greener Carbon Intensity API](https://carbon.unilaunch.org/docs)
- URL base padrão: `https://carbon.unilaunch.org`
- Variável de ambiente: `CARBON_API_URL`

| Endpoint externo | Função utilizada | Descrição |
|---|---|---|
| `GET /regions` | `listarRegioes()` | Lista as regiões e seus fatores de intensidade de carbono. |
| `GET /regions/{codigo}` | `buscarRegiao(codigo)` | Consulta os dados de uma região. |
| `GET /regions/{codigo}/carbon-intensity` | `buscarIntensidadeCarbono(codigo)` | Consulta a intensidade de carbono de uma região. |

O parâmetro `codigo` deve ser um texto não vazio e diferente de `.` ou `..`. Para obter o fator referente a um serviço, o backend utiliza `location.region_code` fornecido pela API de métricas.

**Formato de região recebido:**

```json
{
  "code": "BR-SE",
  "country": "Brasil",
  "region": "Sudeste",
  "city": "São Paulo",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "carbon_intensity_gco2e_per_kwh": 61.2,
  "renewable_share_percent": 82.5
}
```

**Formato de intensidade de carbono recebido:**

```json
{
  "region_code": "BR-SE",
  "country": "Brasil",
  "region": "Sudeste",
  "city": "São Paulo",
  "carbon_intensity_gco2e_per_kwh": 61.2,
  "renewable_share_percent": 82.5
}
```

A intensidade é expressa em `gCO₂e/kWh` e a participação renovável em percentual. Os valores acima são exemplos ilustrativos, não fatores oficiais ou valores garantidos pela API.

## 5. Tratamento de erros das integrações

As integrações compartilham o cliente `backend/src/integrations/api-client.ts`. O cliente realiza uma requisição por chamada, analisa a resposta como JSON e valida os campos esperados. Não há repetição automática imediata de requisições.

| Tipo de erro | Significado |
|---|---|
| `http` | A API externa retornou um status HTTP fora da faixa de sucesso. O status fica disponível em `statusHttp`. |
| `timeout` | A chamada excedeu o tempo limite, incluindo a leitura do corpo da resposta. |
| `rede` | Não foi possível concluir a conexão com a API externa. |
| `resposta_invalida` | A resposta não contém JSON válido ou não corresponde ao formato esperado. |

Respostas inválidas ou ausentes não são convertidas em métricas iguais a zero. Erros internos das rotas do backend são registrados no log e retornam mensagens públicas controladas, sem expor detalhes do banco ou da implementação.

## 6. Variáveis de ambiente relacionadas à API

As variáveis são configuradas no `.env` da raiz e repassadas ao backend pelo Docker Compose.

| Variável | Finalidade | Padrão |
|---|---|---|
| `PORT` | Porta HTTP interna do backend. | `3000` |
| `METRICS_API_URL` | URL base da API de métricas. | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. | `https://carbon.unilaunch.org` |
| `API_TIMEOUT_MS` | Tempo limite de cada chamada externa, em milissegundos. | `10000` |
| `COLLECTIONS_AUTO_START` | Inicia a coleta periódica junto com o servidor (`true` ou `false`). | `true` |
| `JWT_SECRET` | Segredo de assinatura e validação dos tokens JWT. | Sem valor padrão; obrigatório para autenticação. |
| `PGHOST` | Endereço do servidor PostgreSQL. | Definido pelo Compose como `database`. |
| `PGPORT` | Porta do PostgreSQL. | `5432` |
| `PGDATABASE` | Nome do banco de dados. | `greener` |
| `PGUSER` | Usuário do banco de dados. | `greener` |
| `PGPASSWORD` | Senha do banco de dados. | Definida no `.env`; valor de exemplo apenas para desenvolvimento. |
| `PGCONNECT_TIMEOUT` | Tempo limite de conexão e espera pelo pool, em segundos. | `5` |
| `PGQUERY_TIMEOUT_MS` | Tempo limite de consulta, em milissegundos. | `10000` |

`API_TIMEOUT_MS` deve ser um inteiro positivo. As URLs base devem utilizar `http:` ou `https:` e não podem conter credenciais, parâmetros de consulta ou fragmento.

## 7. Fluxo resumido de integração

1. O backend consulta `GET /services` na API de métricas para descobrir os serviços monitorados.
2. Para cada serviço, consulta `GET /metrics/{id}` e recebe CPU, memória, disco, rede e intervalo de coleta.
3. Quando há localização regional disponível, consulta `GET /regions/{codigo}/carbon-intensity` na API de intensidade de carbono.
4. O backend calcula potência estimada, energia e emissões de CO₂e e registra os dados disponíveis no PostgreSQL.
5. O frontend consulta `GET /services` e `GET /dashboard/indicadores` para apresentar os serviços e os indicadores consolidados.
6. O histórico pode ser consultado por `GET /collections` ou filtrado por `GET /collections?serviceId={id}`.

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
