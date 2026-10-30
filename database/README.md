
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
    └── 001_persistencia_coletas.sql
```

O `schema.sql` define a estrutura, o `seed.sql` carrega os dados iniciais de desenvolvimento e `migrations/` reúne as atualizações para bancos já inicializados.


## 5. Requisitos

Para trabalhar com os arquivos deste diretório, é necessário ter:

- PostgreSQL instalado ou acesso a uma instância PostgreSQL.
- Um cliente SQL, como o `psql` ou o pgAdmin.
- Os arquivos SQL disponibilizados no repositório.
- As permissões necessárias para executar os comandos no banco de dados.

## 6. Execução

A execução dos scripts depende da estrutura e das instruções definidas nos arquivos SQL.

De forma geral, o processo consiste em:

1. Preparar o ambiente PostgreSQL.
2. Verificar o conteúdo e a finalidade dos scripts.
3. Criar ou selecionar o banco de dados de destino, conforme as instruções do projeto.
4. Executar os scripts na ordem adequada.
5. Verificar se as estruturas foram criadas corretamente.

**Atenção:** antes de executar um script, verifique os comandos presentes no arquivo e confirme o banco de dados selecionado. Operações de criação, alteração ou remoção podem afetar os dados existentes.


### 6.1. Atualizar um banco existente

A migração [`001_persistencia_coletas.sql`](migrations/001_persistencia_coletas.sql), da issue #92, atualiza bancos existentes sem recriar tabelas ou limpar dados. Ela adiciona o identificador externo dos serviços quando necessário, vincula os oito serviços conhecidos dos dados iniciais aos IDs confirmados na API de métricas e permite gravar intervalo de coleta igual a zero. Os IDs internos, status, histórico e metadados obrigatórios das regiões são preservados.

Em um volume novo, o Compose executa `schema.sql` e `seed.sql` automaticamente. Para um volume já inicializado, aplique a migração antes de executar novas coletas. Na raiz `greener/`, com o `.env` preparado conforme o [README principal](../README.md), execute:

```powershell
docker compose up -d --wait database
docker compose cp database/migrations/001_persistencia_coletas.sql database:/tmp/tp07.sql
docker compose exec -T database psql -v ON_ERROR_STOP=1 -U greener -d greener -f /tmp/tp07.sql
```

Os comandos usam o usuário e o banco padrão. Se o seu `.env` tiver outros valores, ajuste o argumento de `-U` para o valor de `POSTGRES_USER` e o de `-d` para o valor de `POSTGRES_DB`.

A execução bem-sucedida termina com `COMMIT`. A migração pode ser reaplicada; avisos de que a coluna ou o índice já existem são esperados. Se houver erro, o script interrompe a execução e a transação é desfeita.

O vínculo dos registros antigos exige que o cadastro corresponda ao seed conhecido. Nomes duplicados na aplicação `GreenER Demo`, IDs externos conflitantes ou localização divergente interrompem a migração. Nesse caso, confira os registros e suas coletas para confirmar o vínculo correto antes de executar novamente; a migração não escolhe um registro arbitrariamente nem mescla históricos. Serviços antigos fora desse conjunto exigem mapeamento manual confirmado.

Use a migração para atualizar bancos com dados a preservar. O `schema.sql` contém comandos que apagam tabelas, e o `seed.sql` limpa dados antes de carregá-los novamente. Para manter os dados ao encerrar o ambiente, use `docker compose down` sem a opção `-v`, que remove os volumes.

Os comandos e resultados esperados dos [testes de persistência estão no README do backend](../backend/README.md#testes-de-persistência).

### 7. [Documentação Complementar](https://github.com/greenstackfatec-tech/greener/blob/develop/README.md)

Para informações gerais sobre o projeto, sua arquitetura e suas demais tecnologias, consulte o arquivo `README.md` localizado na raiz do repositório.

Eles podem ser encontrados <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/README.md">aqui</a>

---

