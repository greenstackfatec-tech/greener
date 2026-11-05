# Mocks locais — GreenER

## 📌 Sobre os mocks

Mocks são respostas simuladas de uma API. No GreenER, permitem desenvolver e testar o frontend e ensaiar a apresentação sem depender das APIs do cliente, usando dados fictícios e cenários de falha.

<br>

## 🧱 Estrutura

```text
backend/src/mocks/
├── app.ts          # Define as respostas de cada cenário.
├── server.ts       # Inicia o servidor local.
├── fixtures.ts     # Guarda os dados fictícios.
└── mocks.test.ts   # Testa os mocks com as integrações do projeto.
```

## 🔌 APIs utilizadas

- [Métricas](https://metrics.unilaunch.org/docs): `GET /services`, `/services/{id}` e `/metrics/{id}`.
- [Carbono](https://carbon.unilaunch.org/docs): `GET /regions`, `/regions/{codigo}` e `/regions/{codigo}/carbon-intensity`.

A região do serviço (`location.region_code`) conecta as duas APIs.

<br>

## ⚙️ Como executar

Com Node.js **22.16 ou mais recente**, na raiz `greener`:

```powershell
cd backend
npm run mock
```

O mock fica em **http://127.0.0.1:4010**, sem precisar de banco ou internet. **Deixe o comando em execução** e faça consultas pelo navegador ou por outro terminal. A porta pode ser alterada pela variável `MOCK_PORT`.

Para o backend executado no mesmo computador usar os mocks, configure em outro terminal antes de iniciá-lo:

```powershell
$env:METRICS_API_URL = "http://127.0.0.1:4010"
$env:CARBON_API_URL = "http://127.0.0.1:4010"
```

O frontend local pode consultar `fetch("http://127.0.0.1:4010/metrics/servico-1")`; o mock permite CORS. Verifique `resposta.ok` para tratar `404`/`500` e `location === null` no caso sem localização. O proxy `/api/` atual encaminha ao backend.

## 🧪 Cenários

Abra os caminhos abaixo após `http://127.0.0.1:4010`:

- **Sucesso:** `/metrics/servico-1` → `200` com métricas fictícias.
- **Não encontrado:** `/metrics/inexistente` → `404`.
- **Serviço fora do ar:** `/cenarios/servico-fora-do-ar/metrics/servico-1` → `500`.
- **Sem métricas:** `/cenarios/sem-metricas/metrics/servico-1` → `500` com `error` e `message`.
- **Sem localização:** `/cenarios/sem-localizacao/services/servico-1` → `200` com `location: null`, rejeitado pela integração como `resposta_invalida`.

Use `/services` e `/regions` para consultar os IDs disponíveis. Para aplicar um cenário às integrações, acrescente `/cenarios/NOME` à URL base da API.

O campo `metrics_path` retornado na lista e no detalhe do serviço preserva o cenário selecionado. No frontend, resolva esse caminho em relação à origem do mock, por exemplo `new URL(servico.metrics_path, "http://127.0.0.1:4010")`, para seguir o caminho anunciado.

**Observações:** dados fictícios e fixos. Em `sem-metricas`, o status e o formato seguem o contrato; os textos são ilustrativos.

**Limite do cenário sem localização:** o OpenAPI exige `location` como objeto e não documenta uma resposta para serviço sem localização. O mock usa `location: null` como injeção de dados inválidos para testar o tratamento dessa falha.

<br>

## ✅ Como testar

Na pasta `backend`:

```powershell
npm ci
npm run typecheck
npm test
```

Os testes iniciam e encerram o mock automaticamente. Cobrem as integrações, os cenários de falha e o fluxo de listar serviços e seguir o `metrics_path` anunciado, incluindo a comparação com o detalhe do serviço.

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
