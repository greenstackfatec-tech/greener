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

As integrações com as APIs de métricas e intensidade de carbono são configuradas por `METRICS_API_URL`, `CARBON_API_URL` e `API_TIMEOUT_MS`. O backend oferece rotas de serviços, coletas, configuração e autenticação JWT; consulte [`docs/api.md`](../docs/api.md).

## Autenticação JWT — TP18 / issue #98

O login verifica o hash bcrypt armazenado em `usuarios.senha_hash`.

Defina `JWT_SECRET` com pelo menos 32 bytes aleatórios. Gere uma chave local com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Sem Node instalado, use `docker run --rm node:22.16.0-alpine node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.

No Docker, coloque o resultado em `JWT_SECRET` no `.env` da raiz, ignorado pelo Git. Fora do Docker, exporte essa variável e as variáveis `PG*` no terminal; o Node não carrega `.env` automaticamente. A chave é obrigatória para emitir e verificar tokens. Sem uma chave válida, as rotas públicas continuam funcionando, mas as operações que precisam emitir ou verificar um JWT retornam `500` e não liberam acesso. Não existe chave padrão no código.

Envie `POST /auth/login` com `Content-Type: application/json` e `{"email":"teste@greener.com","senha":"greener123"}`. Essas credenciais pertencem somente ao seed de desenvolvimento. Espaços nas extremidades do e-mail são removidos; ele deve ter até 150 caracteres. A senha é preservada exatamente como digitada e limitada a 72 bytes UTF-8 para evitar truncamento do bcrypt. O caractere NUL não é permitido.

A resposta de sucesso é `{"token":"<JWT assinado>"}`. O token expira após uma hora e contém a identidade do usuário, sem senha ou hash. `GET /monitoring-settings` exige `Authorization: Bearer <token>` e responde `401` para token ausente, inválido ou expirado. Novas rotas de configuração devem aplicar o mesmo middleware `exigirAutenticacao`. Pelo frontend, os caminhos recebem o prefixo `/api`.

O login responde `400` para JSON/campos inválidos, `401` para e-mail inexistente ou senha incorreta (mesma mensagem para ambos), `413` para corpo maior que 8 KiB e `415` para formato diferente de JSON. Falhas internas retornam `500` sem detalhes na resposta. Login e configuração usam `Cache-Control: no-store`.

O login permite até cinco tentativas incorretas por e-mail em uma janela de cinco minutos, iniciada na primeira tentativa. Tentativas em andamento reservam uma posição antes da consulta ao banco, para que requisições simultâneas não ultrapassem a cota. Um login válido zera as falhas anteriores; erros internos e entradas com formato inválido não consomem tentativas. Ao atingir o limite, inclusive para e-mails inexistentes, a resposta é `429` com `{"error":"too_many_requests","message":"Muitas tentativas de login. Aguarde antes de tentar novamente."}` e `Retry-After` com os segundos restantes. A tela de login deve respeitar esse prazo. Requisições bloqueadas não prolongam a janela.

O controle usa o e-mail após remover espaços nas extremidades e não depende de IP ou `X-Forwarded-For`; usuários diferentes atrás do mesmo proxy não compartilham a cota. Os contadores ficam na memória de um único processo e são perdidos ao reiniciá-lo. Há espaço para até 10 mil e-mails com janelas ativas; se esse teto for alcançado, novos e-mails também recebem `429` até liberar espaço, preservando os bloqueios existentes. Antes de usar múltiplas réplicas, o controle precisará de armazenamento compartilhado.

Para validar a entrega, execute em `backend/`:

```bash
npm i
npm run typecheck
npm test
```

Os testes de autenticação simulam apenas a consulta ao PostgreSQL e verificam o login, a proteção das rotas, erros de entrada, tokens adulterados/expirados e o limite de tentativas (incluindo concorrência e liberação após a janela). Para testar com PostgreSQL real, configure o `.env`, inicie `docker compose up --build -d` na raiz e execute `npm run test:integration` em `backend/`. Esse teste usa a conta do seed, não altera registros e verifica backend e proxy. Se mudar as portas, configure `TEST_API_URL` e `TEST_PROXY_URL`.
