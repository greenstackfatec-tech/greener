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

## Persistência de serviços e coletas

A cada rodada, o backend consulta os serviços da API de métricas, salva seus cadastros na tabela `servicos` e registra as métricas na tabela `metricas_servico`. O acesso ao banco usa os repositories com SQL parametrizado.

O campo `id_externo` identifica o serviço na API. Um serviço já cadastrado é atualizado pelo mesmo ID externo, operação chamada *upsert*. O ID interno retornado pelo banco relaciona suas coletas ao cadastro. Assim, rodadas seguintes acrescentam histórico sem duplicar o serviço, e serviços diferentes podem ter o mesmo nome.

O banco precisa conter a aplicação `GreenER Demo` e a região de cada serviço. O arquivo de dados iniciais [`seed.sql`](../database/seed.sql) cadastra a aplicação e as regiões usadas pelas APIs do projeto. A coleta localiza a região pelo par `(nome, país)`, sem alterar seus fatores de emissão. Uma região ainda não cadastrada precisa ser incluída com nome, país, fator de emissão e ano de referência, conforme o [`schema.sql`](../database/schema.sql), antes da coleta.

### Atualizar um banco existente

No Compose, os dados ficam no volume `postgres_data`. Em um volume novo, `schema.sql` e `seed.sql` são executados automaticamente na primeira inicialização do PostgreSQL. Em um volume já existente, aplique a [migração descrita no README do banco](../database/README.md#61-atualizar-um-banco-existente) antes de executar novas rodadas.

A migração preserva IDs internos e histórico, vincula os serviços conhecidos do seed aos seus IDs externos e permite gravar intervalo de coleta zero, aceito pela API e pela calculadora. Ela interrompe a atualização se encontrar um vínculo ambíguo ou conflitante.

### Executar e consultar uma coleta

Com o ambiente iniciado conforme o [README principal](../README.md), execute no PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/collections/executar"
Invoke-RestMethod -Uri "http://localhost:3000/services"
Invoke-RestMethod -Uri "http://localhost:3000/collections"
```

O primeiro comando executa uma rodada; os outros consultam os serviços e o histórico das últimas 100 coletas. Ajuste a porta se tiver alterado `BACKEND_PORT` no `.env`. Iniciar o backend não inicia automaticamente a rotina periódica de coleta.

A resposta da rodada contém o resumo em `dados` e os resultados por serviço em `dados.detalhes`. O comportamento da gravação é:

- **Métricas e cálculo disponíveis:** grava as métricas e os resultados de potência, energia e CO₂e.
- **Falha no cálculo ou na consulta de carbono:** preserva as métricas recebidas, com `status_coleta = 'sucesso'`, e deixa os campos de cálculo e `calculado_em` nulos. O erro aparece em `dados.detalhes[].erro` e no contador `dados.erros`. Nesse caso, `sucesso` indica obtenção das métricas; não significa que o cálculo foi concluído.
- **Todas as métricas iguais a zero:** grava os zeros e classifica a coleta como `sem_metricas`.
- **Falha ao obter métricas:** registra uma coleta `indisponivel`, sem valores de métricas. HTTP 404 apenas é reportado, sem inserir uma coleta.
- **Falha ao gravar no banco:** a rodada retorna HTTP 500 depois de aguardar os demais serviços. Gravações já concluídas permanecem no banco; a rodada inteira não é uma única transação.

### Testes de persistência

Com Node.js/npm instalados e Docker em execução, use a pasta `backend`:

```powershell
npm ci
npm run typecheck
npm test
npm run test:persistence
```

O comando `npm test` executa os testes locais sem exigir PostgreSQL. O comando `npm run test:persistence` prepara o ambiente Docker de teste e verifica os critérios da issue #92:

1. Grava rodadas usando os repositories reais e respostas de APIs simuladas pelos mocks locais.
2. Compara os serviços e as coletas antes e depois de reiniciar e recriar os contêineres.
3. Executa uma nova rodada e confirma que os IDs dos serviços foram preservados.
4. Executa os testes de integração de coleta, migração, repositories e autenticação pelo backend e pelo proxy.

O teste usa o projeto separado `greener-tp07-check`, seu próprio volume e as portas `55492` (PostgreSQL), `30492` (backend) e `18092` (frontend), que precisam estar livres. A configuração combina [`compose.yaml`](../compose.yaml) com [`compose.persistence.yaml`](../compose.persistence.yaml) e usa `.env.example` e variáveis definidas pelo script, sem carregar o `.env` do ambiente principal.

**Resultado esperado:** mensagens confirmando a persistência após reiniciar e recriar os contêineres, seguidas dos resultados dos testes sem falhas. Ao terminar, o script para os contêineres de teste e mantém o volume para inspeção e novas execuções. O ambiente normal continua usando apenas `compose.yaml`.

#### Usar um PostgreSQL já disponível

Como alternativa para testar somente coleta e migração, configure as variáveis de conexão e execute `npm run test:collections:integration` em `backend/`. O exemplo abaixo usa os valores de desenvolvimento de `.env.example`; ajuste-os para o banco que será acessado:

```powershell
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGDATABASE = "greener"
$env:PGUSER = "greener"
$env:PGPASSWORD = "greener_dev_only"
npm run test:collections:integration
```

Esses testes criam schemas temporários exclusivos, aplicam neles a estrutura e os dados de teste e os removem ao terminar. O usuário do banco precisa ter permissão para criar schemas. Esse comando não verifica reinício de contêineres; para isso, use `npm run test:persistence`. Fora do Compose, o Node não carrega automaticamente o `.env` da raiz.

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

Os testes locais de autenticação simulam apenas a consulta ao PostgreSQL e verificam o login, a proteção das rotas, erros de entrada, tokens adulterados/expirados e o limite de tentativas (incluindo concorrência e liberação após a janela). Para testar com PostgreSQL real, configure o `.env`, inicie `docker compose up --build -d` na raiz, exporte as variáveis `PG*` correspondentes ao banco e execute `npm run test:integration` em `backend/`. Esse comando verifica autenticação pelo backend e pelo proxy com a conta do seed e também testa os repositories, que criam e removem seus próprios registros de teste. Se mudar as portas HTTP, configure `TEST_API_URL` e `TEST_PROXY_URL`. Para executar essas verificações no ambiente isolado, use `npm run test:persistence`, descrito acima.
