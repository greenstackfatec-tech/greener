# Backend GreenER

O container inicia um servidor HTTP em `PORT` (padrão `3000`) e usa as variáveis padrão do PostgreSQL (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`) para conectar ao banco.

## Endpoints de saúde

| Método | Caminho | Resultado |
|---|---|---|
| `GET` | `/health/live` | Confirma que o processo HTTP está ativo. |
| `GET` | `/health/ready` | Confirma que o backend consegue executar uma consulta no PostgreSQL; retorna `503` enquanto o banco estiver indisponível. |

No Compose, o serviço espera o banco ficar saudável antes de iniciar. O frontend encaminha chamadas em `/api/` para o backend.

## Desenvolvimento local

Na pasta `backend`, instale as dependências com `npm ci`, valide os tipos com `npm run typecheck` e inicie com `npm start`. Para iniciar fora do Compose, configure as variáveis `PG*` para apontarem a um PostgreSQL acessível.

As integrações com as APIs de métricas e intensidade de carbono são configuradas por `METRICS_API_URL`, `CARBON_API_URL` e `API_TIMEOUT_MS`. Ainda não há rotas de produto implementadas; consulte [`docs/api.md`](../docs/api.md).