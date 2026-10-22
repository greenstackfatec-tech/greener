# 🔌 Documentação da API do GreenER

## Introdução

Esta documentação apresenta as APIs utilizadas pelo GreenER para consultar métricas de serviços e dados de intensidade de carbono. Reúne os endpoints das integrações externas, os parâmetros de consulta, os formatos de resposta, o tratamento de erros e as configurações necessárias para apoiar o desenvolvimento e a manutenção do projeto.

## API de métricas

Implementação: `backend/src/integrations/metrics-api.ts`

- Documentação externa: [Greener Metrics Aggregator API](https://metrics.unilaunch.org/docs)
- URL base padrão: `https://metrics.unilaunch.org`
- Variável para substituir a URL base: `METRICS_API_URL`
- Todas as operações usam o método `GET`.

| Endpoint externo | Função no backend | Retorno validado |
|---|---|---|
| `/services` | `listarServicos()` | Array de serviços (`Servico[]`). |
| `/services/{id}` | `buscarServico(id)` | Um serviço (`Servico`). |
| `/metrics/{id}` | `buscarMetricas(id)` | Intervalo de coleta e métricas (`RespostaMetricas`). |

O parâmetro `id` é obrigatório, deve ser não vazio e não pode ser `.` ou `..`. O valor é codificado como segmento do caminho antes da requisição.

### Tipos de resposta

**`Servico`**

| Campo | Tipo |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `location` | `LocalizacaoServico` |
| `metrics_path` | `string` |

**`LocalizacaoServico`**

| Campo | Tipo |
|---|---|
| `region_code` | `string` |
| `country` | `string` |
| `region` | `string` |
| `city` | `string \| null` |
| `latitude` | `number` finito |
| `longitude` | `number` finito |

**`RespostaMetricas`**

| Campo | Tipo e validação |
|---|---|
| `collection_interval_seconds` | Inteiro seguro, maior ou igual a zero. |
| `metrics.cpu_percent` | `number` entre 0 e 100. |
| `metrics.memory_gb` | `number` finito. |
| `metrics.disk_gb` | `number` finito. |
| `metrics.network_gb` | `number` finito. |

## API de intensidade de carbono

Implementação: `backend/src/integrations/carbon-api.ts`

- Documentação externa: [Greener Carbon Intensity API](https://carbon.unilaunch.org/docs)
- URL base padrão: `https://carbon.unilaunch.org`
- Variável para substituir a URL base: `CARBON_API_URL`
- Todas as operações usam o método `GET`.

| Endpoint externo | Função no backend | Retorno validado |
|---|---|---|
| `/regions` | `listarRegioes()` | Objeto `RespostaRegioes`. |
| `/regions/{codigo}` | `buscarRegiao(codigo)` | Uma região (`RegiaoCarbono`). |
| `/regions/{codigo}/carbon-intensity` | `buscarIntensidadeCarbono(codigo)` | Intensidade da região (`IntensidadeCarbono`). |

O parâmetro `codigo` é obrigatório, deve ser não vazio e não pode ser `.` ou `..`. O valor é codificado como segmento do caminho. Para consultar a intensidade da região de um serviço, a integração indica usar `location.region_code`, retornado pela API de métricas.

### Tipos de resposta

**`RespostaRegioes`**

| Campo | Tipo |
|---|---|
| `regions` | Array de `RegiaoCarbono`. |
| `total` | Inteiro seguro. |

**`RegiaoCarbono`**

| Campo | Tipo |
|---|---|
| `code` | `string` |
| `country` | `string` |
| `region` | `string` |
| `city` | `string \| null` |
| `latitude` | `number` finito |
| `longitude` | `number` finito |
| `carbon_intensity_gco2e_per_kwh` | `number` finito |
| `renewable_share_percent` | `number` finito |

**`IntensidadeCarbono`**

| Campo | Tipo |
|---|---|
| `region_code` | `string` |
| `country` | `string` |
| `region` | `string` |
| `city` | `string \| null` |
| `carbon_intensity_gco2e_per_kwh` | `number` finito |
| `renewable_share_percent` | `number` finito |

Os nomes dos campos indicam as unidades declaradas pela API: `gCO₂e/kWh` para intensidade de carbono e percentual para participação renovável. O código atual valida que esses valores sejam números finitos, mas não aplica limites de faixa para eles. As interfaces também não informam período de referência ou fonte dos fatores; consulte a documentação externa antes de interpretar ou comparar esses dados.

## Requisições e erros das integrações

As duas integrações usam o cliente compartilhado `backend/src/integrations/api-client.ts`, que envia requisições `GET` com o cabeçalho `Accept: application/json`. Não envia credenciais ou tokens e não repete requisições automaticamente.

O cliente analisa o corpo como JSON e as integrações validam os campos necessários antes de devolver os tipos descritos acima. Os erros de requisição e de validação das respostas são lançados como `ErroApi`, com um dos seguintes valores em `tipo`:

| Tipo | Quando ocorre |
|---|---|
| `http` | A API responde com status HTTP fora da faixa de sucesso. `statusHttp` contém o status; `codigoApi` pode conter o campo `error` da resposta. |
| `timeout` | A requisição excede o tempo limite configurado, incluindo a leitura do corpo. |
| `rede` | Falha de conexão que não seja timeout. |
| `resposta_invalida` | Uma resposta de sucesso não contém JSON válido ou não atende ao formato esperado pela integração. |

O erro HTTP usa o campo `message` da resposta externa quando ele é uma string; caso contrário, usa uma mensagem genérica com o status. O código de integração não converte ausência ou invalidade de métricas em zero.

Parâmetros `id` ou `codigo` inválidos e configurações inválidas de URL base ou timeout geram `TypeError` antes do envio da requisição.

## Configuração

No Compose, as variáveis são carregadas do arquivo `.env` na raiz do repositório, criado a partir de `.env.example`, e repassadas ao backend.

| Variável | Uso | Padrão |
|---|---|---|
| `METRICS_API_URL` | URL base da API de métricas. | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | URL base da API de intensidade de carbono. | `https://carbon.unilaunch.org` |
| `API_TIMEOUT_MS` | Tempo limite da requisição em milissegundos. | `10000` |
| `FRONTEND_PORT` | Porta publicada pelo frontend na máquina host. | `8080` |
| `BACKEND_PORT` | Porta publicada pelo backend na máquina host. | `3000` |
| `POSTGRES_PORT` | Porta publicada pelo PostgreSQL na máquina host. | `5432` |
| `POSTGRES_DB` | Nome do banco criado pelo container PostgreSQL. | `greener` |
| `POSTGRES_USER` | Usuário do banco. | `greener` |
| `POSTGRES_PASSWORD` | Senha do banco. | `greener_dev_only` (somente desenvolvimento local) |

O timeout deve ser um inteiro positivo, até `2147483647`. As URLs base devem usar `http:` ou `https:` e não podem conter credenciais, parâmetros de consulta ou fragmento. O cliente usa `fetch` e `AbortController` do runtime; não carrega variáveis de ambiente a partir de arquivo por conta própria.

## Rotas próprias do GreenER

O servidor HTTP fornece endpoints de saúde para verificação do ambiente:

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/health/live` | HTTP 200 `{"status":"ok"}` quando o processo está ativo. |
| `GET` | `/health/ready` | HTTP 200 `{"status":"ok","database":"connected"}` quando o banco responde; HTTP 503 `{"status":"not_ready","database":"unavailable"}` se não responder. |

O frontend publica os mesmos endpoints sob `/api/` por meio do proxy Nginx, por exemplo `GET /api/health/ready`. As rotas de produto dos módulos `backend/src/modules/coletas/` ainda não foram implementadas. Não há middleware JWT nem autenticação configurados; as integrações externas também não enviam tokens.


---

*FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026*
