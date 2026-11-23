# Mocks locais — GreenER

← [Voltar à documentação](README.md)

## 1. Objetivo

Mocks são respostas simuladas utilizadas durante o desenvolvimento e os testes. No GreenER existem **dois mecanismos separados**, com finalidades diferentes:

1. **Mock das APIs externas do backend:** simula a Metrics Aggregator API e a Carbon Intensity API. Permite testar os clientes de integração sem chamar os serviços externos.
2. **Mock da API GreenER no frontend:** simula respostas que normalmente seriam retornadas pelo backend GreenER. Permite desenvolver e demonstrar as telas sem subir backend ou banco.

Os dados são fictícios. Resultados apresentados nesses ambientes não representam medições reais dos serviços monitorados.

---

## 2. Mock das APIs externas do backend

### 2.1 Estrutura

Implementação em `backend/src/mocks/`:

```text
backend/src/mocks/
├── app.ts          # Rotas, cenários e respostas simuladas.
├── server.ts       # Inicialização do servidor HTTP local.
├── fixtures.ts     # Dados fictícios de serviços, regiões e métricas.
└── mocks.test.ts   # Testes dos cenários e dos clientes de integração.
```

O servidor atende as rotas que os clientes de integração utilizam:

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/services` | Lista serviços fictícios. |
| GET | `/services/{id}` | Consulta um serviço pelo ID externo. |
| GET | `/metrics/{id}` | Retorna as métricas fictícias do serviço. |
| GET | `/regions` | Lista regiões fictícias. |
| GET | `/regions/{codigo}` | Consulta uma região. |
| GET | `/regions/{codigo}/carbon-intensity` | Retorna intensidade de carbono da região. |

A lista de serviços inclui `metrics_path`, que aponta para a rota de métricas correspondente. Os clientes podem seguir esse caminho sem precisar montar uma URL diferente para cada cenário.

### 2.2 Como executar

Utilize Node.js 24, conforme a versão de desenvolvimento documentada pelo projeto. Na pasta `backend`:

```powershell
npm ci
npm run mock
```

O servidor fica disponível em:

```text
http://127.0.0.1:4010
```

A porta pode ser alterada pela variável `MOCK_PORT`. O processo deve permanecer em execução enquanto o backend ou os testes manuais estiverem utilizando o mock.

Para direcionar o backend local às respostas simuladas, defina as variáveis antes de iniciar o backend:

```powershell
$env:METRICS_API_URL = "http://127.0.0.1:4010"
$env:CARBON_API_URL = "http://127.0.0.1:4010"
```

Em seguida, inicie o backend em outro terminal:

```powershell
cd backend
npm run start
```

O mock externo não depende de PostgreSQL nem de conexão com a internet. O backend continua precisando do banco para executar as regras de persistência.

### 2.3 Cenários disponíveis

Os cenários são selecionados pelo prefixo `/cenarios/{nome}`. O nome do cenário também é preservado no `metrics_path` retornado pela lista de serviços.

| Cenário | Exemplo | Comportamento |
|---|---|---|
| `normal` | `/services` | Retorna serviços, métricas e regiões fictícios. |
| `servico-fora-do-ar` | `/cenarios/servico-fora-do-ar/metrics/servico-1` | O serviço continua listado, mas a consulta de métricas retorna HTTP 500 com `error: "service_unavailable"`. |
| `sem-metricas` | `/cenarios/sem-metricas/metrics/servico-1` | A consulta retorna HTTP 500 com `error: "metrics_missing"`. A aplicação deve registrar `sem_metricas`, manter o serviço ativo e não calcular energia ou CO₂e. |
| `sem-localizacao` | `/cenarios/sem-localizacao/services/servico-1` | A resposta externa usa `location: null`. A integração normaliza os campos de localização para nulos e não existe `region_code` para consultar o fator de carbono. |

Um identificador inexistente retorna HTTP `404`. Um cenário desconhecido retorna HTTP `400` com a lista de nomes permitidos.

A rota `/services` devolve os serviços com o `metrics_path` adequado ao cenário. Assim, por exemplo, a rota retornada para o cenário `sem-metricas` continua levando à resposta daquele cenário.

### 2.4 Cabeçalhos e comportamento HTTP

O servidor de mock externo:

- aceita `GET` e `OPTIONS`;
- responde ao preflight CORS com HTTP `204`;
- permite origem `*` para desenvolvimento local;
- define `Cache-Control: no-store`;
- responde HTTP `405` para métodos diferentes de GET e OPTIONS.

O cenário `sem-localizacao` usa `location: null` como convenção de teste negativa. Essa forma não substitui o contrato OpenAPI da API externa, mas verifica a capacidade da integração de lidar com serviços sem dados de localização.

### 2.5 Como testar

Na pasta `backend`:

```powershell
npm run typecheck
npm test
```

O script de testes inclui `src/mocks/mocks.test.ts`. Os testes iniciam um servidor em porta dinâmica e verificam:

- compatibilidade com os clientes de métricas e carbono;
- listagem, detalhe e `metrics_path`;
- métricas normais;
- serviço indisponível e ausência de métricas;
- serviço sem localização;
- regiões e intensidade de carbono;
- respostas 404, cenário desconhecido e CORS;
- isolamento entre cenários executados simultaneamente.

---

## 3. Mock da API GreenER no frontend

### 3.1 Estrutura e ativação

O mock do frontend está em `frontend/mock-servicos.ts` e é registrado em `frontend/vite.config.ts`.

Para executar:

```powershell
cd frontend
npm ci
npm run dev:mock
```

A aplicação fica disponível por padrão em:

```text
http://localhost:5173
```

Nesse modo, o Vite não encaminha `/api` para o backend. O plugin responde diretamente às rotas simuladas. Assim, não é necessário iniciar o backend nem o PostgreSQL para visualizar as telas e experimentar parte dos fluxos.

### 3.2 Endpoints simulados

O mock atual responde aos seguintes caminhos:

| Método | Caminho | Uso |
|---|---|---|
| GET | `/api/services` | Lista seis serviços fictícios com estados, métricas e localizações diferentes. |
| GET | `/api/dashboard/indicadores` | Retorna indicadores consolidados simulados. |
| GET | `/api/analytics/historico/{servicoId}` | Gera pontos fictícios de histórico para um serviço. |
| GET | `/api/analytics/ranking` | Retorna classificação, aplicações, resumo e tendência simulados. |
| GET | `/api/analytics/comparacao` | Retorna valores comparativos para os IDs solicitados. |
| POST | `/api/auth/login` | Aceita credenciais de demonstração e retorna um token fictício. |
| GET | `/api/__mock` | Consulta ou altera o cenário ativo do mock. |

O mock do frontend não implementa todas as rotas do backend. Em particular, ele não simula cadastro (`POST /auth/register`), configuração (`GET/PUT /monitoring-settings`) nem diagnóstico da rotina (`GET /collections/rotina/status`). Essas áreas precisam do backend real ou podem exibir estados de erro quando executadas sem ele.

### 3.3 Dados de demonstração

O endpoint `/api/services` retorna seis serviços de exemplo, cobrindo situações como:

- serviço ativo com métricas;
- serviço indisponível;
- serviço ativo sem métricas;
- serviço ainda sem coleta;
- serviço removido;
- serviços com coordenadas em regiões diferentes e serviços sem coordenadas.

Esses dados são definidos na função `servicos()` dentro de `frontend/mock-servicos.ts`.

Os indicadores são calculados a partir da lista simulada. O histórico gera pontos sintéticos em intervalos de cinco minutos para uma janela limitada às últimas 24 horas e utiliza variação aleatória. O ranking e a comparação usam conjuntos fictícios preparados especificamente para a demonstração das telas.

Como há geração aleatória no histórico, os valores podem variar entre consultas. Não utilize essas respostas como evidência de resultados reais ou de estabilidade numérica.

### 3.4 Cenários disponíveis

O cenário é controlado por `GET /api/__mock?cenario=...`.

| Cenário | Comportamento implementado |
|---|---|
| `ok` | Retorna os dados fictícios normais. |
| `vazio` | Retorna lista de serviços vazia, indicadores zerados, ranking sem classificados e comparação sem coletas. |
| `erro` | Responde com HTTP 502 e mensagem de erro simulada. |
| `lento` | A rota de ranking aguarda aproximadamente 1,2 segundo. As demais rotas não possuem atraso efetivo consistente nesse cenário. |
| `rede` | Encerra a conexão para simular falha de rede. |

**Limitação conhecida dos cenários:** o cenário `vazio` não possui tratamento completo para a rota de histórico e pode deixar a requisição sem resposta. O cenário `lento` possui atraso específico na rota de ranking; não representa um atraso uniforme para todas as rotas. Para testar timeout e estados de erro de modo confiável, use testes automatizados ou o mock de integração do backend.

Para consultar o cenário atual:

```text
http://localhost:5173/api/__mock
```

Para selecionar um cenário:

```text
http://localhost:5173/api/__mock?cenario=ok
http://localhost:5173/api/__mock?cenario=vazio
http://localhost:5173/api/__mock?cenario=erro
http://localhost:5173/api/__mock?cenario=lento
http://localhost:5173/api/__mock?cenario=rede
```

Após trocar o cenário, use “Atualizar dados” ou refaça a consulta na tela correspondente.

### 3.5 Autenticação de demonstração

O mock do frontend implementa `POST /api/auth/login` e aceita qualquer e-mail e senha para facilitar a demonstração visual.

A resposta inclui um token fictício com assinatura textual `mock-signature`. Esse token **não é um JWT válido para o backend real** e não deve ser utilizado fora do modo de demonstração local.

O modo mock não substitui testes de autenticação, autorização ou persistência de usuários.

### 3.6 Limitações funcionais do mock do frontend

| Funcionalidade | Situação no mock |
|---|---|
| Dashboard e serviços | Simulados. |
| Indicadores | Simulados a partir dos serviços fictícios. |
| Histórico | Pontos gerados artificialmente, com variação aleatória. |
| Ranking | Conjunto fictício com total, média, tendência e resumo. |
| Comparação | Valores simulados para os IDs selecionados. |
| Mapa | Utiliza as coordenadas dos serviços fictícios. |
| Login | Aceita qualquer credencial e retorna token fictício. |
| Cadastro | Não implementado no plugin. |
| Alteração do intervalo | Não implementada no plugin. |
| Diagnóstico da rotina de coleta | Não implementado no plugin. |
| Coleta real e persistência | Não executadas no modo mock. |

---

## 4. Qual mock utilizar?

| Objetivo | Mock indicado |
|---|---|
| Testar se o backend interpreta corretamente a API externa | Mock de integração em `backend/src/mocks/`. |
| Simular falha da API de métricas ou de carbono | Cenários do mock de integração do backend. |
| Desenvolver telas sem iniciar backend e banco | Mock de frontend com `npm run dev:mock`. |
| Conferir ranking, histórico, comparação e mapa visualmente | Mock de frontend. |
| Validar autenticação e persistência reais | Backend e PostgreSQL reais; não utilizar token fictício. |
| Validar comportamento real de coleta e cálculo | Backend com APIs externas ou mock de integração configurado. |

## 5. Cuidados

- Não apresentar dados de mock como medições reais.
- Não utilizar o token fictício do frontend contra o backend real.
- Não incluir credenciais, tokens ou dados pessoais em capturas de tela.
- As respostas simuladas não garantem que as APIs externas estejam disponíveis.
- Para validar contratos, compare o mock com [`api.md`](./api.md) e os clientes em `backend/src/integrations/`.
- Para validar cálculos, utilize os testes e a implementação de `backend/src/calculos/calculo-energia.ts`, não os valores aleatórios do mock do frontend.

## 6. Referências relacionadas

- [Documentação da API](./api.md)
- [Arquitetura e modelo de dados](./arquitetura.md)
- [Cálculos de consumo e CO₂e](./calculos.md)
- [README do backend](../backend/README.md)
- [README do frontend](../frontend/README.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
