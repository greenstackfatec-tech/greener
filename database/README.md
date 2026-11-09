
# Database — GreenER

## 1. Visão Geral

Esta pasta contém os arquivos responsáveis pela definição e organização da estrutura do banco de dados do projeto GreenER.

O banco de dados é responsável por armazenar e organizar as informações utilizadas por uma aplicação, permitindo que sejam consultadas, inseridas, atualizadas e removidas de maneira estruturada.

## 2. Objetivo

O objetivo desta camada é disponibilizar uma estrutura de armazenamento organizada, consistente e confiável para os dados da aplicação.

Os arquivos deste diretório documentam e definem a estrutura necessária para a criação e a manutenção do banco de dados.

## 3. Tecnologia Utilizada

| Tecnologia | Descrição |
|---|---|
| PostgreSQL | Sistema gerenciador de banco de dados relacional de código aberto. |
| SQL | Linguagem utilizada para definir estruturas, consultar e manipular dados. |

### 3.1. PostgreSQL

O PostgreSQL é um sistema gerenciador de banco de dados relacional que permite armazenar informações em tabelas e estabelecer relacionamentos entre elas.

### 3.2. SQL

SQL (*Structured Query Language*) é a linguagem utilizada para interagir com o banco de dados. Por meio dela, é possível criar tabelas, definir restrições, consultar informações e realizar operações sobre os dados.

## 4. Organização do Diretório

Os arquivos presentes neste diretório são utilizados para definir e documentar a estrutura do banco de dados.

```text
database/
├── README.md
├── modelagem_bd.png
├── schema.sql
├── seed.sql
└── migrations/
    ├── 000_schema_inicial.sql
    ├── 001_persistencia_coletas.sql
    ├── 002_servico_sem_localizacao.sql
    └── 003_seed_dados_iniciais.sql
```

A pasta `migrations/` é o caminho oficial para criar e evoluir o banco: o Docker Compose a monta em `/docker-entrypoint-initdb.d` e executa os scripts em ordem numérica quando o volume está vazio.

`schema.sql` e `seed.sql` continuam no repositório como **scripts de reinício para desenvolvimento e testes automatizados**. O `schema.sql` apaga e recria as tabelas, e o `seed.sql` limpa os dados antes de carregá-los; por isso, nunca os execute em um banco com dados que você queira manter.

### 4.1. Migrations

Cada arquivo de `migrations/` é um passo numerado e transacional (`BEGIN` ... `COMMIT`): se algum comando falhar, nada do arquivo é gravado.

| Nº | Arquivo | Issue | O que faz | Em banco vazio | Em banco com dados |
|---|---|---|---|---|---|
| 000 | `000_schema_inicial.sql` | #106 | Cria todas as tabelas, já no estado atual. | Aplicar. | **Não aplicar** (as tabelas já existem). |
| 001 | `001_persistencia_coletas.sql` | #92 | Adiciona `servicos.id_externo`, vincula os serviços do seed e permite intervalo de coleta igual a zero. | Não altera nada. | Aplicar se ainda não aplicada. Pode ser reaplicada. |
| 002 | `002_servico_sem_localizacao.sql` | #82 | Permite `servicos.regiao_id` nulo quando a localização é desconhecida. | Não altera nada. | Aplicar se ainda não aplicada. Pode ser reaplicada. |
| 003 | `003_seed_dados_iniciais.sql` | #106 | Carrega regiões, aplicação, oito serviços, configuração de intervalo e o usuário de teste. | Aplicar (somente em desenvolvimento). | **Não aplicar** (os registros já existem). |

As migrations 001 e 002 ajustam bancos criados antes delas. Como a 000 já nasce com o resultado das duas, em um banco novo elas executam sem efeito.

Regras para as migrations:

- O nome segue `NNN_descricao.sql`, e a ordem de aplicação é a ordem numérica.
- Uma migration já compartilhada **não é editada**; qualquer correção ou mudança nova vira um arquivo novo, com o próximo número.
- Não contêm `DROP TABLE` nem `TRUNCATE`.
- Começam com `BEGIN;`, terminam com `COMMIT;` e são executadas com `psql -v ON_ERROR_STOP=1`.

## 5. Requisitos

Para trabalhar com os arquivos deste diretório, é necessário ter:

- PostgreSQL instalado ou acesso a uma instância PostgreSQL.
- Um cliente SQL, como o `psql` ou o pgAdmin.
- Os arquivos SQL disponibilizados no repositório.
- As permissões necessárias para executar os comandos no banco de dados.

## 6. Execução

**Atenção:** antes de executar um script, confirme o banco de dados selecionado. Comandos de criação, alteração ou remoção podem afetar os dados existentes.

### 6.1. Criar o banco do zero (banco vazio)

Em um banco vazio, a ordem é: `000_schema_inicial.sql`, `001_persistencia_coletas.sql`, `002_servico_sem_localizacao.sql` e `003_seed_dados_iniciais.sql`, ou seja, todos os arquivos de `migrations/` em ordem numérica.

**Com Docker Compose (automático).** Na raiz `greener/`, com o `.env` preparado conforme o [README principal](../README.md):

```powershell
docker compose up -d --wait database
```

O PostgreSQL executa a pasta `migrations/` sozinho, apenas na primeira inicialização, quando o volume ainda está vazio. Para acompanhar:

```powershell
docker compose logs database
```

Para recriar o banco do zero em um volume que já foi inicializado, remova o volume. **Isso apaga todos os dados do banco:**

```powershell
docker compose down -v
docker compose up -d --wait database
```

**Com PostgreSQL local, sem Docker.** Na raiz `greener/`, com `psql` e `createdb` disponíveis no `PATH` (no Windows, o `bin` da instalação, como `C:\Program Files\PostgreSQL\18\bin`). O `PGCLIENTENCODING` evita erro com acentos:

```powershell
$env:PGCLIENTENCODING = "UTF8"
createdb -U postgres greener
foreach ($arquivo in Get-ChildItem database\migrations\*.sql | Sort-Object Name) {
    psql -v ON_ERROR_STOP=1 -U postgres -d greener -f $arquivo.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha em $($arquivo.Name)" }
}
```

Em Linux ou macOS:

```bash
createdb -U postgres greener
for f in database/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -U postgres -d greener -f "$f" || break; done
```

Sem terminal, no pgAdmin: crie o banco, abra o Query Tool e execute cada arquivo de `migrations/` na ordem numérica.

**Verificar.** O banco deve ter sete tabelas e oito serviços:

```powershell
docker compose exec -T database psql -U greener -d greener -c "\dt"
docker compose exec -T database psql -U greener -d greener -c "SELECT id_externo, nome FROM servicos ORDER BY id;"
```

Em instalação local, use o mesmo `psql` dos comandos acima, sem o prefixo `docker compose exec -T database`. O usuário de teste do seed é `teste@greener.com`, com a senha `greener123`; ele existe só para desenvolvimento.

### 6.2. Onde ficam as consultas DML

As consultas de `SELECT`, `INSERT` e `UPDATE` usadas pela aplicação ficam no backend, nos arquivos `*.repository.ts` de cada módulo, sempre parametrizadas (`$1`, `$2`, ...). A conexão está em `backend/src/db/connection.ts`. Alterações de estrutura (DDL) ficam somente em `database/migrations/`.

| Arquivo (em `backend/src/`) | Tabelas | Uso |
|---|---|---|
| `modules/auth/auth.repository.ts` | `usuarios` | Busca o usuário pelo e-mail no login. |
| `modules/services/services.repository.ts` | `servicos`, `regioes`, `aplicacoes`, `metricas_servico` | Lista e busca serviços com a última coleta; cadastra ou atualiza serviços (por `id_externo`) e regiões. |
| `modules/collections/collections.repository.ts` | `metricas_servico`, `servicos` | Grava cada coleta, atualiza o status do serviço e consulta o histórico. |
| `modules/resultados/resultados.repository.ts` | `metricas_servico` | Grava e consulta os resultados de potência, energia e emissão. |
| `modules/dashboard-indicators/dashboard-indicators.repository.ts` | `metricas_servico`, `servicos` | Indicadores consolidados do dashboard. |
| `modules/configuracoes/configuracoes.repository.ts` | `configuracoes` | Lê o intervalo de coleta. |

### 6.3. Aplicar uma migration em um banco que já tem dados

O Compose só executa `migrations/` quando o volume está vazio. Em um volume já inicializado, uma migration nova **não roda sozinha**, e não é preciso recriar o volume: aplique somente o arquivo novo, na raiz `greener/`.

**1. Descubra o que já foi aplicado.** O banco não guarda um registro das migrations; confira o resultado delas:

```sql
-- 001: deve retornar uma linha
SELECT column_name FROM information_schema.columns
WHERE table_name = 'servicos' AND column_name = 'id_externo';

-- 001: deve mostrar CHECK ((intervalo_segundos >= 0))
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'metricas_servico_intervalo_segundos_check';

-- 002: deve retornar YES
SELECT is_nullable FROM information_schema.columns
WHERE table_name = 'servicos' AND column_name = 'regiao_id';
```

Aplique apenas as migrations de número maior que a última já aplicada. Não aplique a `000` nem a `003` em um banco com dados.

**2. Faça um backup (recomendado).**

```powershell
docker compose exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > /tmp/backup.sql'
docker compose cp database:/tmp/backup.sql ./backup.sql
```

**3. Aplique a migration.** Troque o nome do arquivo pelo da migration desejada:

```powershell
docker compose up -d --wait database
docker compose cp database/migrations/001_persistencia_coletas.sql database:/tmp/migration.sql
docker compose exec -T database psql -v ON_ERROR_STOP=1 -U greener -d greener -f /tmp/migration.sql
```

Os comandos usam o usuário e o banco padrão. Se o seu `.env` tiver outros valores, ajuste o argumento de `-U` para o valor de `POSTGRES_USER` e o de `-d` para o valor de `POSTGRES_DB`. Em um PostgreSQL local, execute `psql -v ON_ERROR_STOP=1 -U postgres -d greener -f database/migrations/<arquivo>.sql`.

**4. Confirme.** A execução bem-sucedida termina com `COMMIT`. Se houver erro, o script interrompe a execução e a transação é desfeita: o banco continua como estava, e você pode corrigir a causa e executar de novo.

Para manter os dados ao encerrar o ambiente, use `docker compose down` sem a opção `-v`, que remove os volumes.

### 6.4. Observações sobre a migration 001

O vínculo dos registros antigos exige que o cadastro corresponda ao seed conhecido. Nomes duplicados na aplicação `GreenER Demo`, IDs externos conflitantes ou localização divergente interrompem a migração. Nesse caso, confira os registros e suas coletas para confirmar o vínculo correto antes de executar novamente; a migração não escolhe um registro arbitrariamente nem mescla históricos. Serviços antigos fora desse conjunto exigem mapeamento manual confirmado.

### 6.5. Criar uma migration nova

1. Crie `database/migrations/NNN_descricao.sql`, com `NNN` igual ao próximo número da sequência.
2. Estruture o arquivo assim, sem `DROP TABLE` e sem `TRUNCATE`:

```sql
-- NNN_descricao.sql (issue #XX): o que muda e por quê.
-- Execute com psql -v ON_ERROR_STOP=1.
BEGIN;

ALTER TABLE servicos ADD COLUMN exemplo VARCHAR(50);

COMMIT;
```

3. Teste em um banco vazio (seção 6.1) e em um banco com dados (seção 6.3).
4. Reflita a mudança em `schema.sql` (e em `seed.sql`, se envolver dados), porque os testes automatizados e o reinício de desenvolvimento usam esses dois arquivos como estado atual do banco.
5. Atualize a tabela da seção 4.1.

Os comandos e resultados esperados dos [testes de persistência estão no README do backend](../backend/README.md#5-banco-de-dados-e-persistência).

## 7. [Documentação Complementar]

Para informações gerais sobre o projeto, sua arquitetura e suas demais tecnologias, consulte o arquivo `README.md` localizado na raiz do repositório.

Eles podem ser encontrados <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/README.md">aqui</a>

---

