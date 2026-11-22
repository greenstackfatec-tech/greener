# 🔌 Documentação da API do GreenER

← [Voltar à documentação](README.md)

**Projeto:** GreenER · **Equipe:** Green Stack · **Curso:** DSM — FATEC Jacareí  

---

## 1. Introdução

A API do **GreenER** disponibiliza os serviços monitorados, o histórico das coletas, os indicadores ambientais, as consultas de análise, a autenticação de usuários e as configurações do monitoramento. O backend também integra duas APIs externas: uma para obter métricas de infraestrutura e outra para consultar a intensidade de carbono da região do serviço.

Este documento diferencia três situações:

- **Implementada:** a rota está registrada no backend e pode ser chamada.
- **Implementada parcialmente:** a rota existe, mas ainda não atende a todos os dados ou comportamentos esperados pelo frontend.
- **Contrato planejado:** o formato está documentado para orientar o frontend e permitir mocks, mas a rota ainda não está registrada no backend.

## 2. Configuração e acesso

### URL base

Durante a execução local com Docker Compose, o backend fica disponível em:

```text
http://localhost:3000
```

O frontend utiliza o prefixo `/api`, encaminhado pelo proxy do Vite em desenvolvimento e pelo Nginx no container. Por exemplo:

```http
GET http://localhost:8080/api/services
```

### Formato das requisições

- As respostas são fornecidas em JSON.
- Requisições com corpo JSON devem utilizar `Content-Type: application/json`.
- As datas e horas dos exemplos usam ISO 8601 em UTC (`Z`).
- Os identificadores internos dos serviços são números inteiros positivos.
- A resposta genérica para uma rota inexistente é HTTP `404` com `{ "error": "not_found" }`.

### Situação das rotas da Sprint 3

| Grupo | Rota | Situação no backend |
|---|---|---|
| Histórico de análise | `GET /analytics/historico/{servicoId}` | Implementada |
| Ranking | `GET /analytics/ranking` | Implementada |
| Comparação | `GET /analytics/comparacao` | Implementada |
| Consulta de configuração | `GET /monitoring-settings` | Implementada |
| Alteração de configuração | `PUT /monitoring-settings` | Implementada |
| Cadastro | `POST /auth/register` | Implementada |

### Autenticação JWT

O login é realizado por `POST /auth/login`. Em caso de sucesso, a API retorna um token JWT com validade de uma hora.

Para acessar as rotas protegidas, envie:

```http
Authorization: Bearer <token>
```

O backend utiliza a variável `JWT_SECRET` para assinar e validar os tokens. Ela deve conter pelo menos 32 bytes e ser definida no arquivo `.env`, criado a partir de `.env.example`. Não compartilhe nem versione o arquivo `.env`.

As rotas de serviços, coletas, indicadores, configurações e análises exigem JWT válido. As rotas de saúde, cadastro e login são públicas.

**Token ausente, inválido ou expirado — HTTP 401:**

```json
{
  "error": "unauthorized",
  "message": "Token ausente ou inválido."
}
```

A resposta inclui `WWW-Authenticate: Bearer` quando o token está ausente ou `Bearer error="invalid_token"` quando o cabeçalho foi rejeitado. O middleware verifica a autenticação antes da validação dos parâmetros de negócio.

---

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

Verifica se o backend consegue executar uma consulta no PostgreSQL.

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

Retorna os serviços cadastrados no GreenER, com sua identificação, estado, localização disponível e os dados da última coleta. Quando ainda não existe coleta, os campos referentes à coleta e às métricas vêm como `null`.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.

**Resposta de sucesso — HTTP 200:**

```json
[
  {
    "id": 1,
    "nome": "Billing API",
    "status": "ativo",
    "cidade": "São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "regiao": "Sudeste",
    "pais": "Brasil",
    "coletadoEm": "2026-11-17T12:00:00.000Z",
    "statusColeta": "sucesso",
    "cpuPercentual": 42.5,
    "memoriaGb": 2.0,
    "discoGb": 10.25,
    "redeGb": 0.5,
    "energiaKwh": 0.000723,
    "emissaoCo2eG": 0.0441,
    "localizacao": {
      "pais": "Brasil",
      "regiao": "Sudeste",
      "cidade": "São Paulo"
    }
  }
]
```

Os estados persistidos do serviço são `ativo`, `indisponivel` e `removido`. Os estados da coleta são `sucesso`, `sem_metricas` e `indisponivel`. A ausência de dados de localização não impede a listagem: os campos estruturados permanecem `null` e os textos de apresentação em `localizacao` usam `"Não informado"`.

#### `GET /services/{id}`

Retorna os dados básicos de um serviço específico, identificado pelo ID interno do banco de dados.

**Parâmetro de caminho:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | Inteiro positivo | Sim | Identificador interno do serviço. |

**Autenticação:** obrigatória.

**Exemplo de requisição:**

```http
GET /services/1
Authorization: Bearer <token>
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

Retorna as últimas 100 coletas registradas, ordenadas da mais recente para a mais antiga.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.

**Resposta de sucesso — HTTP 200:**

```json
[
  {
    "id": 25,
    "servicoId": 1,
    "coletadoEm": "2026-11-17T12:00:00.000Z",
    "statusColeta": "sucesso"
  }
]
```

#### `GET /collections?serviceId={id}`

Retorna o histórico detalhado de coletas de um serviço. O resultado é limitado às 100 coletas mais recentes daquele serviço.

**Parâmetro de consulta:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `serviceId` | Inteiro positivo | Sim, para filtrar | ID interno do serviço no banco de dados. |

**Autenticação:** obrigatória.

**Exemplo de requisição:**

```http
GET /collections?serviceId=1
Authorization: Bearer <token>
```

**Resposta de sucesso — HTTP 200:**

```json
[
  {
    "id": 25,
    "coletadoEm": "2026-11-17T12:00:00.000Z",
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
    "calculadoEm": "2026-11-17T12:00:01.000Z"
  }
]
```

Quando não existem coletas para o serviço, a resposta é um array vazio (`[]`). Campos de métricas e cálculo podem ser `null`, conforme o estado da coleta e a disponibilidade do cálculo.

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
**Autenticação:** obrigatória.  
**Corpo:** não é necessário.

**Resposta — HTTP 200:**

A propriedade `resultado` informa o resultado geral da rodada:

- `completo`: todos os serviços foram processados com cálculo completo, ou a API não retornou serviços.
- `parcial`: a rodada terminou, mas houve serviços sem métricas, indisponíveis ou sem cálculo completo.
- `falha`: todos os serviços retornaram indisponíveis.

```json
{
  "sucesso": false,
  "resultado": "parcial",
  "mensagem": "Rodada concluída com resultados parciais.",
  "dados": {
    "coletadoEm": "2026-11-17T12:00:00.000Z",
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
          "ocorridoEm": "2026-11-17T12:00:01.000Z"
        },
        "erro": "Métricas recebidas; cálculo de energia e CO₂e indisponível nesta coleta."
      }
    ]
  }
}
```

Cada item de `dados.detalhes` representa um serviço processado. Uma falha isolada não impede o processamento dos demais serviços.

**Possíveis erros:**

| HTTP | Código | Descrição |
|---|---|---|
| `502` | `external_api_failure` | Falha externa ao consultar a lista de serviços. |
| `504` | `external_api_timeout` | A API externa excedeu o tempo limite ao consultar a lista de serviços. |
| `500` | `internal_error` | Erro interno, de configuração ou persistência. |

Exemplo:

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

A rotina pode ser iniciada automaticamente quando o servidor HTTP sobe, exceto quando `COLLECTIONS_AUTO_START=false`. O intervalo utilizado pela rotina é consultado na configuração persistida `intervalo_coleta_segundos`. O campo `collection_interval_seconds` recebido da API de métricas representa a duração da amostra e é utilizado nos cálculos e no histórico; não substitui o intervalo de agendamento.

#### `POST /collections/rotina/iniciar`

Inicia manualmente a rotina de coleta periódica.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.  
**Cabeçalho obrigatório:** `Content-Type: application/json`.

**Corpo opcional:**

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `intervaloSegundos` | Inteiro | Não | De 1 até 2.147.483 segundos. É validado por compatibilidade, mas não substitui o intervalo salvo na configuração. O corpo pode ser `{}`. |

**Exemplo de requisição:**

```http
POST /collections/rotina/iniciar
Content-Type: application/json
Authorization: Bearer <token>
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
  "mensagem": "Rotina iniciada com o intervalo configurado pela aplicação",
  "dados": {
    "intervaloSegundos": 60,
    "executando": true,
    "encerrando": false,
    "coletasEmAndamento": 0,
    "intervaloAlternativoSegundos": 60
  }
}
```

**Erros:** HTTP `400` para intervalo inválido, JSON inválido ou rotina já iniciada/em encerramento; HTTP `415` quando o cabeçalho não indica JSON; HTTP `500` em falha interna.

#### `POST /collections/rotina/parar`

Solicita a parada da rotina, cancela os agendamentos e aguarda as coletas já iniciadas terminarem.

**Parâmetros e corpo:** nenhum.  
**Autenticação:** obrigatória.

**Resposta de sucesso — HTTP 200:**

```json
{
  "sucesso": true,
  "mensagem": "Rotina de coleta parada com sucesso"
}
```

Responde HTTP `400` se não houver rotina em execução e HTTP `500` em falha interna durante o encerramento.

#### `GET /collections/rotina/status`

Retorna o estado atual da rotina e o diagnóstico das coletas. A resposta é um retrato mantido em memória pelo processo; não dispara nova coleta.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.  
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
      "iniciadoEm": "2026-11-17T11:00:00.000Z",
      "ultimaTentativaDescobertaEm": "2026-11-17T12:00:00.000Z",
      "ultimaDescobertaValidaEm": "2026-11-17T12:00:00.100Z",
      "ultimaTentativaColetaEm": "2026-11-17T12:00:01.000Z",
      "ultimaColetaCompletaEm": "2026-11-17T12:00:02.000Z",
      "falhasAtivas": []
    }
  }
}
```

Os estados de `monitoramento.situacao` são `aguardando`, `ok` e `degradado`. Em `degradado`, `falhasAtivas` lista falhas ainda não resolvidas, com etapa, tipo, código, mensagem e horário. O diagnóstico é reiniciado quando o processo do backend é reiniciado.

### 3.6. Autenticação e cadastro

#### `POST /auth/register`

Cria uma conta sem exigir token. **A rota está implementada**, mas ainda não persiste todos os dados que o formulário de cadastro do frontend coleta.

**Autenticação:** não exige.  
**Cabeçalho obrigatório:** `Content-Type: application/json`.

**Corpo aceito pelo backend atual:**

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `nome` | Texto | Sim | De 1 a 100 caracteres após remover espaços das extremidades. |
| `email` | Texto | Sim | E-mail válido, até 150 caracteres; espaços das extremidades são removidos. |
| `senha` | Texto | Sim | Mínimo de 8 caracteres e máximo de 72 bytes em UTF-8. Os espaços são preservados. |

**Exemplo de requisição compatível com o backend atual:**

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "nome": "Pessoa de Teste",
  "email": "cadastro@example.com",
  "senha": "SenhaTeste123!"
}
```

**Resposta de sucesso — HTTP 201:**

```json
{
  "id": "2"
}
```

A resposta utiliza `Cache-Control: no-store`. A senha é armazenada somente como hash bcrypt. O cadastro não emite token; após criar a conta, o usuário deve realizar o login.

**Campos do formulário ainda não persistidos:** o frontend também envia `tipoPessoa` (`fisica` ou `juridica`) e `documento` (CPF ou CNPJ). A implementação atual aceita esses campos adicionais no JSON, mas os ignora: não valida CPF/CNPJ, não os armazena e não garante unicidade do documento. A tabela `usuarios` usada pelo cadastro atual persiste apenas nome, e-mail e hash da senha. Portanto, a tela não deve tratar tipo de pessoa e documento como dados já salvos pelo backend.

**Erros possíveis:**

| HTTP | Código | Descrição |
|---|---|---|
| `400` | `invalid_request` | Nome, e-mail ou senha ausentes ou inválidos. |
| `400` | `invalid_json` | Corpo JSON malformado. |
| `409` | `email_already_exists` | E-mail já cadastrado. |
| `413` | `payload_too_large` | Corpo acima de 8 KiB. |
| `415` | `unsupported_media_type` | O Content-Type não é `application/json`. |
| `500` | `internal_server_error` | Falha inesperada no backend ou no banco. |

As respostas de validação e conflito seguem o formato:

```json
{
  "error": "invalid_request",
  "message": "Informe um nome de 1 a 100 caracteres."
}
```

O código `document_already_exists`, previsto no frontend, ainda não é emitido pelo backend atual.

#### `POST /auth/login`

Valida as credenciais do usuário e emite um token JWT.

**Parâmetros:** nenhum.  
**Autenticação:** não exige.  
**Cabeçalho obrigatório:** `Content-Type: application/json`.

**Corpo da requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `email` | Texto | Sim | E-mail cadastrado. |
| `senha` | Texto | Sim | Senha da conta. |

**Exemplo de requisição:**

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "usuario@exemplo.com",
  "senha": "SenhaTeste123!"
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
| `400` | `invalid_json` | Corpo JSON inválido. |
| `400` | `invalid_request` | E-mail ou senha ausentes ou inválidos. |
| `401` | `invalid_credentials` | E-mail ou senha incorretos. |
| `413` | `payload_too_large` | Corpo acima de 8 KiB. |
| `415` | `unsupported_media_type` | Content-Type diferente de `application/json`. |
| `429` | `too_many_requests` | Limite de tentativas de login atingido. |
| `500` | `internal_server_error` | Erro interno. |

O limitador permite até cinco tentativas incorretas por e-mail em uma janela de cinco minutos. Quando retorna `429`, a resposta inclui `Retry-After`, em segundos. O limitador é mantido em memória pelo processo.

### 3.7. Configurações de monitoramento

#### `GET /monitoring-settings`

Retorna o intervalo de coleta salvo em `configuracoes`, na chave `intervalo_coleta_segundos`.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.

**Resposta de sucesso — HTTP 200:**

```json
{
  "intervaloColetaSegundos": 60
}
```

O valor é numérico. O padrão usado quando a chave não existe é 60 segundos. Um valor fora do intervalo agendável ou uma falha na consulta resulta em HTTP `500`.

#### `PUT /monitoring-settings` — contrato planejado

**Situação:** ainda não implementada no backend.

O frontend já possui a função `salvarIntervaloColeta`, que envia este método e corpo. Entretanto, `monitoring-settings.routes.ts` registra somente `GET /monitoring-settings`. No estado atual do backend, uma chamada `PUT` retorna HTTP `404` (`not_found`).

O contrato abaixo serve para criação de mocks e alinhamento entre frontend e backend. **Não representa uma rota funcional ainda.**

**Autenticação prevista:** JWT obrigatório.  
**Cabeçalho previsto:** `Content-Type: application/json`.

**Corpo proposto:**

| Campo | Tipo | Obrigatório | Regra para o mock |
|---|---|---|---|
| `intervaloColetaSegundos` | Inteiro | Sim | A interface atual trabalha com mínimo de 10 e máximo de 86.400 segundos (24 horas). O limite máximo está marcado no frontend como provisório e precisa ser confirmado na implementação do backend. |

**Exemplo de requisição planejada:**

```http
PUT /monitoring-settings
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "intervaloColetaSegundos": 120
}
```

**Resposta de sucesso proposta — HTTP 200:**

```json
{
  "intervaloColetaSegundos": 120
}
```

**Respostas previstas para a implementação:**

| HTTP | Código proposto | Situação |
|---|---|---|
| `400` | `invalid_interval` | Valor ausente, não inteiro ou fora dos limites acordados. |
| `401` | `unauthorized` | Token ausente, inválido ou expirado. |
| `500` | `internal_server_error` | Falha ao persistir a configuração ou atualizar a rotina. |

O nome do campo e o método seguem o cliente atual do frontend. O limite definitivo e a sincronização da rotina ativa devem ser confirmados quando o endpoint for implementado.

### 3.8. Indicadores do dashboard

#### `GET /dashboard/indicadores`

Retorna os indicadores consolidados utilizados no dashboard. Os totais consideram os resultados calculados disponíveis; as contagens separam serviços ativos e indisponíveis. A resposta também informa o horário da última coleta e o intervalo de coleta configurado.

**Parâmetros:** nenhum.  
**Autenticação:** obrigatória.

**Resposta de sucesso — HTTP 200:**

```json
{
  "consumo_total_kwh": 0.32345678,
  "emissao_total_co2e_g": 1.25,
  "servicos_ativos": 2,
  "servicos_indisponiveis": 1,
  "ultima_coleta_em": "2026-11-17T12:00:00.000Z",
  "intervalo_coleta_segundos": 60
}
```

Quando ainda não há coletas calculadas, os totais são `0`. Sem nenhuma coleta, `ultima_coleta_em` é `null`.

**Erro interno — HTTP 500:**

```json
{
  "error": "internal_error"
}
```

### 3.9. Análises: histórico, ranking e comparação

As três rotas de análise estão implementadas em `backend/src/modules/analytics/analytics.routes.ts`. Todas exigem JWT e recebem parâmetros de período em ISO 8601.

#### Padrão de período

As rotas de análise que consultam um período exigem os parâmetros `inicio` e `fim`. Ambos são inclusivos e devem ser datas válidas em ISO 8601. `inicio` precisa ser anterior ou igual a `fim`.

Exemplo:

```text
inicio=2026-11-01T00:00:00Z&fim=2026-11-17T23:59:59Z
```

#### `GET /analytics/historico/{servicoId}`

Retorna as coletas de um serviço dentro do período solicitado.

**Parâmetro de caminho:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `servicoId` | Inteiro positivo | Sim | ID interno do serviço. |

**Parâmetros de consulta:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `inicio` | Data ISO 8601 | Sim | — | Início inclusivo do período. |
| `fim` | Data ISO 8601 | Sim | — | Fim inclusivo do período. |
| `apenasSucesso` | Booleano textual | Não | `true` | `true` mantém apenas coletas com status `sucesso`; `false` inclui também `sem_metricas` e `indisponivel`. |
| `limite` | Inteiro não negativo | Não | `1000` | Quantidade máxima de registros. |
| `offset` | Inteiro não negativo | Não | `0` | Quantidade de registros a pular. |
| `ordenacao` | `ASC` ou `DESC` | Não | `DESC` | Ordena pela data da coleta; `DESC` traz as mais recentes primeiro. |

**Autenticação:** obrigatória.

**Exemplo de requisição:**

```http
GET /analytics/historico/1?inicio=2026-11-01T00:00:00Z&fim=2026-11-17T23:59:59Z&apenasSucesso=false&limite=100&offset=0&ordenacao=DESC
Authorization: Bearer <token>
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "dados": [
    {
      "coletadoEm": "2026-11-17T12:00:00.000Z",
      "cpuPercentual": 42.5,
      "memoriaGb": 2.0,
      "discoGb": 10.25,
      "redeGb": 0.5,
      "intervaloSegundos": 60,
      "statusColeta": "sucesso",
      "potenciaEstimadaW": 43.375,
      "duracaoSegundos": 60,
      "energiaKwh": 0.000723,
      "emissaoCo2eG": 0.0441
    }
  ],
  "periodo": {
    "inicio": "2026-11-01T00:00:00.000Z",
    "fim": "2026-11-17T23:59:59.000Z"
  }
}
```

Os campos numéricos da coleta podem ser `null` quando não foram recebidos ou calculados.

**Erros possíveis — HTTP 400:**

| Código | Motivo |
|---|---|
| `invalid_id` | ID da rota não é inteiro positivo. |
| `invalid_period` | `inicio` ou `fim` ausente/inválido, ou período invertido. |
| `invalid_limit` | `limite` não é inteiro não negativo. |
| `invalid_offset` | `offset` não é inteiro não negativo. |
| `invalid_order` | `ordenacao` diferente de `ASC` ou `DESC`. |

**Serviço sem registros no período:** HTTP `200` com `dados: []`.

#### `GET /analytics/ranking`

Retorna o ranking de serviços por consumo energético ou emissão de CO₂e no período solicitado. A consulta considera coletas com status `sucesso`.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `inicio` | Data ISO 8601 | Sim | — | Início inclusivo do período. |
| `fim` | Data ISO 8601 | Sim | — | Fim inclusivo do período. |
| `metrica` | `energia` ou `co2e` | Sim | — | Métrica usada para ordenar o ranking. |
| `agregacao` | `total` ou `media` | Não | — | Seleciona a soma ou a média por coleta e inclui os dados de resumo usados na tela de ranking. |
| `ordenacao` | `ASC` ou `DESC` | Não | `DESC` | Ordem crescente ou decrescente. |
| `limite` | Inteiro não negativo | Não | `20` | Quantidade máxima de resultados. |
| `offset` | Inteiro não negativo | Não | `0` | Quantidade de resultados a pular. |
| `aplicacaoId` | Inteiro positivo | Não | — | Filtra por aplicação. |
| `regiaoId` | Inteiro positivo | Não | — | Filtra por região. |
| `apenasAtivos` | Booleano textual | Não | `true` | `false` inclui também serviços que não estão ativos. |

**Autenticação:** obrigatória.

**Exemplo de requisição:**

```http
GET /analytics/ranking?inicio=2026-11-01T00:00:00Z&fim=2026-11-17T23:59:59Z&metrica=energia&ordenacao=DESC&limite=20&offset=0&apenasAtivos=true
Authorization: Bearer <token>
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "dados": [
    {
      "servicoId": 1,
      "nome": "Billing API",
      "regiao": "Sudeste",
      "pais": "Brasil",
      "totalEnergiaKwh": 0.0042,
      "totalEmissaoCo2eG": 0.256,
      "qtdColetas": 6,
      "mediaEnergiaKwh": 0.0007,
      "mediaEmissaoCo2eG": 0.0427
    }
  ],
  "periodo": {
    "inicio": "2026-11-01T00:00:00.000Z",
    "fim": "2026-11-17T23:59:59.000Z"
  },
  "metrica": "energia",
  "ordenacao": "DESC"
}
```

Sem `agregacao`, a resposta segue o exemplo. A ordem usa o total da métrica escolhida e a consulta agrega coletas com os dois valores disponíveis.

Com `agregacao`, a ordem usa o total ou a média da métrica escolhida e cada indicador é agregado a partir dos seus valores disponíveis. `qtdColetas` conta as coletas com valor para a métrica escolhida. Cada item também inclui `aplicacao` e `tendenciaPercentual`, calculada sobre o intervalo anterior de mesma duração. Uma métrica ausente ou uma tendência sem base é representada por `null`.

O campo `posicao` é usado apenas internamente para ordenar os resultados e não é retornado em `dados` nem em `resumo.primeiroColocado`. Para numerar os itens de uma página, use `offset + índice do item + 1`, com índice iniciado em zero.

A resposta inclui a `agregacao` aplicada, as `aplicacoes` disponíveis (`id` e `nome`) e `resumo`. O resumo vale para todo o conjunto filtrado e contém `classificados`, `semDados`, `mediaEnergiaKwh`, `mediaEmissaoCo2eG`, `menorEnergia` e `primeiroColocado`.

Os campos abaixo consideram os serviços classificados (com valor para a métrica selecionada), respeitando os filtros e antes de aplicar `limite` e `offset`. Mesmo com `agregacao=total`, os três usam as médias por coleta no período atual:

| Campo do resumo | Cálculo |
|---|---|
| `mediaEnergiaKwh` | Média aritmética das médias de energia por coleta de cada serviço classificado, em kWh. Cada serviço tem o mesmo peso, independentemente da quantidade de coletas; valores `null` são ignorados. Sem médias disponíveis, retorna `null`. |
| `mediaEmissaoCo2eG` | Média aritmética das médias de emissão por coleta de cada serviço classificado, em g CO₂e, também sem ponderação pela quantidade de coletas e ignorando `null`. Sem médias disponíveis, retorna `null`. |
| `menorEnergia` | Objeto com `nome` e `mediaEnergiaKwh` do serviço classificado com a menor média de energia por coleta, independentemente da métrica e da ordem escolhidas para o ranking. Desconsidera médias `null` e, em caso de empate, escolhe o menor `servicoId`. Sem média de energia disponível, retorna `null`. |

**Erros possíveis — HTTP 400:**

| Código | Motivo |
|---|---|
| `invalid_period` | Período ausente ou inválido. |
| `invalid_metric` | `metrica` ausente ou diferente de `energia` e `co2e`. |
| `invalid_aggregation` | `agregacao` diferente de `total` e `media`. |
| `invalid_order` | `ordenacao` diferente de `ASC` ou `DESC`. |
| `invalid_limit` | `limite` não é inteiro não negativo. |
| `invalid_offset` | `offset` não é inteiro não negativo. |
| `invalid_application` | `aplicacaoId` não é inteiro positivo. |
| `invalid_region` | `regiaoId` não é inteiro positivo. |

#### `GET /analytics/comparacao`

Compara de dois a cinco serviços distintos, considerando o mesmo período para todos.

**Parâmetros de consulta:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `servicos` | Lista de IDs separados por vírgula | Sim | — | De 2 a 5 IDs inteiros positivos e distintos. Exemplo: `1,2,3`. |
| `inicio` | Data ISO 8601 | Sim | — | Início inclusivo do período. |
| `fim` | Data ISO 8601 | Sim | — | Fim inclusivo do período. |
| `ordenacao` | `ASC` ou `DESC` | Não | `ASC` | `ASC` preserva a ordem informada dos IDs; `DESC` inverte a ordem. |

**Autenticação:** obrigatória.

**Exemplo de requisição:**

```http
GET /analytics/comparacao?servicos=1,2,3&inicio=2026-11-01T00:00:00Z&fim=2026-11-17T23:59:59Z&ordenacao=ASC
Authorization: Bearer <token>
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "dados": [
    {
      "servicoId": 1,
      "nome": "Billing API",
      "regiao": "Sudeste",
      "pais": "Brasil",
      "totalEnergiaKwh": 0.0042,
      "totalEmissaoCo2eG": 0.256,
      "qtdColetas": 6,
      "mediaEnergiaKwh": 0.0007,
      "mediaEmissaoCo2eG": 0.0427,
      "minEnergiaKwh": 0.0005,
      "maxEnergiaKwh": 0.0009,
      "minEmissaoCo2eG": 0.030,
      "maxEmissaoCo2eG": 0.055
    },
    {
      "servicoId": 2,
      "nome": "Search API",
      "regiao": "Sudeste",
      "pais": "Brasil",
      "totalEnergiaKwh": 0.0,
      "totalEmissaoCo2eG": 0.0,
      "qtdColetas": 0,
      "mediaEnergiaKwh": 0.0,
      "mediaEmissaoCo2eG": 0.0,
      "minEnergiaKwh": 0.0,
      "maxEnergiaKwh": 0.0,
      "minEmissaoCo2eG": 0.0,
      "maxEmissaoCo2eG": 0.0
    }
  ],
  "periodo": {
    "inicio": "2026-11-01T00:00:00.000Z",
    "fim": "2026-11-17T23:59:59.000Z"
  },
  "avisos": [
    "Serviço \"Search API\" (ID 2) não possui dados de coleta no período informado. Retornando zeros."
  ]
}
```

Serviços sem coletas no período continuam no array `dados`, com valores numéricos zerados; a API também inclui uma mensagem em `avisos`. A ordem de `dados` segue a lista de IDs informada, ou sua ordem inversa quando `ordenacao=DESC`.

**Erros possíveis — HTTP 400:**

| Código | Motivo |
|---|---|
| `invalid_period` | Período ausente ou inválido. |
| `invalid_services` | Lista ausente, IDs inválidos, menos de dois ou mais de cinco IDs distintos. |
| `invalid_order` | `ordenacao` diferente de `ASC` ou `DESC`. |

### 3.10. Rotas de análise ainda não expostas

O repositório de análise também contém uma função genérica de agregação por serviço, região, aplicação, dia ou hora. No estado atual, essa função **não está ligada a uma rota HTTP** em `analytics.routes.ts`. Portanto, não existe contrato de endpoint público para agregações genéricas nesta versão; o frontend não deve chamar uma rota presumida para esse recurso.

---

## 4. Integrações com APIs externas

As integrações são realizadas pelo backend. Elas não são endpoints próprios do GreenER e não são expostas como rotas do backend. As chamadas utilizam `GET` e `Accept: application/json`.

### 4.1. API de métricas

Implementação: `backend/src/integrations/metrics-api.ts`.

- Documentação: [Greener Metrics Aggregator API](https://metrics.unilaunch.org/docs)
- URL base padrão: `https://metrics.unilaunch.org`
- Variável de ambiente: `METRICS_API_URL`

| Endpoint externo | Função utilizada | Descrição |
|---|---|---|
| `GET /services` | `listarServicos()` | Lista os serviços disponíveis para monitoramento. |
| `GET /services/{id}` | `buscarServico(id)` | Consulta um serviço pelo identificador externo. |
| `GET /metrics/{id}` | `buscarMetricas(id)` | Consulta métricas e intervalo de coleta de um serviço. |

**Exemplo de serviço recebido:**

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

**Exemplo de métricas recebidas:**

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

CPU deve estar entre 0 e 100; memória, disco e rede devem ser números finitos não negativos. Campos de localização podem estar ausentes ou nulos.

### 4.2. API de intensidade de carbono

Implementação: `backend/src/integrations/carbon-api.ts`.

- Documentação: [Greener Carbon Intensity API](https://carbon.unilaunch.org/docs)
- URL base padrão: `https://carbon.unilaunch.org`
- Variável de ambiente: `CARBON_API_URL`

| Endpoint externo | Função utilizada | Descrição |
|---|---|---|
| `GET /regions` | `listarRegioes()` | Lista regiões e seus fatores de intensidade de carbono. |
| `GET /regions/{codigo}` | `buscarRegiao(codigo)` | Consulta uma região. |
| `GET /regions/{codigo}/carbon-intensity` | `buscarIntensidadeCarbono(codigo)` | Consulta a intensidade de carbono de uma região. |

O backend utiliza `location.region_code` da API de métricas para consultar a intensidade regional.

**Exemplo de intensidade recebida:**

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

A intensidade é expressa em `gCO₂e/kWh` e a participação renovável em percentual. Os valores são ilustrativos.

## 5. Tratamento de erros das integrações

As integrações compartilham o cliente `backend/src/integrations/api-client.ts`. O cliente valida as respostas recebidas e não converte respostas inválidas ou ausentes em métricas iguais a zero.

| Tipo de erro | Significado |
|---|---|
| `http` | A API externa retornou um status HTTP fora da faixa de sucesso. |
| `timeout` | A chamada excedeu o tempo limite, incluindo a leitura do corpo da resposta. |
| `rede` | Não foi possível concluir a conexão com a API externa. |
| `resposta_invalida` | A resposta não contém JSON válido ou não corresponde ao formato esperado. |

Falhas no backend que não sejam tratadas por um controller retornam HTTP `500` com `{ "error": "internal_server_error" }`. O backend registra o detalhe no log e não o expõe na resposta pública.

## 6. Variáveis de ambiente relacionadas à API

As variáveis são configuradas no `.env` da raiz e repassadas ao backend pelo Docker Compose.

| Variável | Finalidade | Padrão |
|---|---|---|
| `PORT` | Porta HTTP interna do backend. | `3000` |
| `METRICS_API_URL` | URL base da API de métricas. | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. | `https://carbon.unilaunch.org` |
| `API_TIMEOUT_MS` | Tempo limite de cada chamada externa, em milissegundos. | `10000` |
| `COLLECTIONS_AUTO_START` | Inicia a coleta periódica junto com o servidor. | `true` |
| `JWT_SECRET` | Segredo de assinatura e validação dos tokens JWT. | Sem valor padrão; obrigatório para autenticação. |
| `PGHOST` | Endereço do PostgreSQL. | `database` no Compose. |
| `PGPORT` | Porta do PostgreSQL. | `5432` |
| `PGDATABASE` | Nome do banco. | `greener` |
| `PGUSER` | Usuário do banco. | `greener` |
| `PGPASSWORD` | Senha do banco. | Definida no `.env`. |
| `PGCONNECT_TIMEOUT` | Tempo limite de conexão, em segundos. | `5` |
| `PGQUERY_TIMEOUT_MS` | Tempo limite de consulta, em milissegundos. | `10000` |

## 7. Fluxo resumido de integração

1. O backend consulta `GET /services` na API de métricas para descobrir os serviços monitorados.
2. Para cada serviço, consulta `GET /metrics/{id}` e recebe CPU, memória, disco, rede e intervalo da amostra.
3. Quando há localização regional disponível, consulta `GET /regions/{codigo}/carbon-intensity` na API de intensidade de carbono.
4. O backend calcula potência estimada, energia e emissões de CO₂e e registra os dados disponíveis no PostgreSQL.
5. O frontend autenticado consulta `GET /services` e `GET /dashboard/indicadores` para apresentar os serviços e os indicadores.
6. As telas de análise consultam `GET /analytics/historico/{servicoId}`, `GET /analytics/ranking` e `GET /analytics/comparacao`.
7. A tela de configuração lê o intervalo por `GET /monitoring-settings`. A alteração por `PUT /monitoring-settings` depende da implementação futura dessa rota.

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
