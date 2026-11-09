<div align="center">

<img width="180" alt="Logo do GreenER" src="https://raw.githubusercontent.com/greenstackfatec-tech/GreenER/c936a2a0ed724d172b82800ead0b9e01a4578ea6/docs/design/greener-circle-logo.png" />

# GreenER - ABP II

Do consumo computacional ao impacto ambiental.
</div>

<br>

## 📚 SUMÁRIO

[Sobre o Projeto](#-sobre-o-projeto) | [Product Backlog](#-product-backlog) | [Plano de Entregas](#-plano-de-entregas) | [Sprints](#-sprints) | [Tecnologias](#%EF%B8%8F-tecnologias) | [Documentação](#-documentação) | [Instalação](#️-como-executar-o-projeto-com-docker) | [Equipe](#%E2%80%8D-nossa-equipe)

<br>

## 📌 Sobre o Projeto

<p  style="text-align: justify;">
  <b>GreenER</b> é uma plataforma web desenvolvida pela equipe <b>Green Stack</b> com o objetivo de estimar o impacto ambiental de aplicações de software a partir de métricas de infraestrutura. Em vez de medir diretamente o consumo elétrico de um servidor, o sistema utiliza informações como utilização de CPU, memória RAM, disco e rede para estimar o consumo energético da aplicação. Em seguida, essas estimativas são combinadas com dados da intensidade de carbono da matriz elétrica da região onde o serviço está hospedado, produzindo indicadores de emissão de CO₂ equivalente (CO₂e).
  </p>

<br>

## 🏅 Desafio

<p  style="text-align: justify;">
  O objetivo do sistema é desenvolver uma solução capaz de coletar métricas de serviços, processar essas informações e gerar indicadores ambientais que auxiliem na compreensão do impacto da computação moderna. Mais do que construir uma aplicação, a meta é explorar um dos temas que provavelmente acompanhará a engenharia de software nas próximas décadas: desenvolver sistemas cada vez mais eficientes, conscientes e sustentáveis.
  </p>

<br>

## 🧱 Estrutura do projeto

```
greener/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/
│   ├── scripts/
│   ├── src/
│   │   ├── calculos/
│   │   ├── db/
│   │   ├── integrations/
│   │   ├── mocks/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── collections/
│   │   │   ├── configuracoes/
│   │   │   ├── dashboard-indicators/
│   │   │   ├── monitoring-settings/
│   │   │   ├── resultados/
│   │   │   └── services/
│   │   └── shared/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   └── tsconfig.json
├── database/
│   ├── migrations/
│   ├── README.md
│   ├── modelagem_bd.png
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── design/
│   ├── diagramas/
│   │   ├── README.md
│   │   ├── diagrama-casos-de-uso.md
│   │   ├── diagrama-classes.md
│   │   └── diagrama-sequencia.md
│   ├── sprints/
│   ├── README.md
│   ├── api.md
│   ├── arquitetura.md
│   ├── calculos.md
│   ├── mocks.md
│   └── plano-de-entregas.md
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── providers/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── caminhos.ts
│   │   ├── estadosServico.ts
│   │   ├── formatacao.ts
│   │   ├── rotas.tsx
│   │   └── ...
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
├── .env.example
├── .gitignore
├── compose.yaml
├── compose.persistence.yaml
├── README.md
└── teste.sql
```

<br>

## [📄 Product Backlog](docs\sprints\product-backlog.md)

<p style="text-align: justify;">
O Product Backlog é uma lista dinâmica e priorizada de todos os requisitos, funcionalidades, melhorias e correções necessários para o desenvolvimento de um produto.<br>
O <b>Product Backlog</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/sprints/product-backlog.md">aqui</a>.
</p>

<br>

## [🏆 Plano de Entregas](docs\plano-de-entregas.md)

<p style="text-align: justify;">
 O plano de entregas organiza os objetivos, os itens selecionados, os responsáveis, os critérios de aceite e as evidências de cada sprint. Também deve registrar a Definition of Done (DoD), utilizada para avaliar se uma entrega pode ser considerada concluída.
<br>
O <b>Plano de Entregas</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/plano%20de%20entregas.md">aqui</a>.
</p>


#### Funcionalidades implementadas

- Integração do backend com a API de métricas dos serviços e com a API de intensidade de carbono.
- Descoberta e consulta dos serviços monitorados.
- Coleta manual e rotina de coleta periódica, respeitando o intervalo informado para cada serviço.
- Persistência dos serviços e dos registros de coleta no PostgreSQL.
- Cálculo estimado de potência, energia e emissão de CO₂e a partir das métricas disponíveis.
- Consulta do histórico de coletas e dos indicadores consolidados do dashboard.
- Identificação de estados como ativo, indisponível e sem métricas, de acordo com os dados recebidos.
- Autenticação de usuários por JWT no backend e tela de login integrada.
- Interface web com tela inicial para verificar a disponibilidade do backend e do banco e dashboard para consultar os serviços.

Os valores apresentados dependem das respostas das APIs e dos registros disponíveis no banco. Quando um dado não é fornecido, a interface deve indicar a ausência de informação, sem substituir o valor por um número fictício.

<br>

## 🎯 Sprints

| Sprints | Data | Status | Relatório | Vídeo |
| :---: | :---: | :---: | :--- | :---: |
| 1 | 19/10/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-1.md) | [Ver vídeo](https://youtu.be/gBj58b91ARw) |
| 2 | 09/11/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-2.md) | [Ver vídeo](https://www.youtube.com/watch?v=dAeaiwG0VI0) |
| 3 | 23/11/2026 | ⬜ | [Indisponível]() | [Indisponível](#) |

### Legenda:

- ⬜ : Não iniciado
- ⌛ : Em andamento
- ✅ : Concluído

<br>

## 🎯 Sprint 01: Prototipação, Banco de dados, e APIs

<p style="text-align: justify;">
A primeira sprint contempla atividades de prototipação, estruturação do banco de dados e preparação das integrações com as APIs auxiliares. O estado de cada atividade e as evidências correspondentes devem ser consultados no relatório da sprint.
<br>
O <b>Sprint Backlog</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/sprints/sprint-1.md">aqui</a>.
</p>

<br>

## 🎯 Sprint 02: Integração, monitoramento e indicadores ambientais

<p style="text-align: justify;">
A segunda sprint tem como objetivo consolidar uma versão funcional do GreenER, integrando a coleta periódica de métricas dos serviços, a persistência dos dados no banco e os cálculos estimados de potência, consumo energético e emissões de CO₂e. Também contempla a implementação da autenticação JWT, dos indicadores ambientais consolidados e do dashboard para visualização dos serviços monitorados, seus estados e respectivos dados. 
<br>
O andamento das atividades, as entregas, as pendências e as evidências podem ser consultados no <b>Relatório da Sprint 2</b>, disponível <a href="./docs/sprints/sprint-2.md">aqui</a>.
</p>

<br>

## 🛠️ Tecnologias

| Tecnologia | Versão |
|------------|---------|
| ![My Skills](https://skillicons.dev/icons?i=react) | v19.3|
| ![My Skills](https://skillicons.dev/icons?i=vite) | v8.3 |
| ![My Skills](https://skillicons.dev/icons?i=ts) | v7.0 (backend) · v6.0 (frontend) |
| ![My Skills](https://skillicons.dev/icons?i=nodejs)| v22.16.0 |
|![My Skills](https://skillicons.dev/icons?i=postgres) | v18.3 |
| ![My Skills](https://skillicons.dev/icons?i=html)| HTML5 |
| ![My Skills](https://skillicons.dev/icons?i=css) | CSS3 |
| ![My Skills](https://skillicons.dev/icons?i=figma) | Web|
| ![My Skills](https://skillicons.dev/icons?i=git) | v2.53 |
| ![My Skills](https://skillicons.dev/icons?i=github) | Web |
| <img src="https://github.com/tandpfun/skill-icons/blob/main/icons/Docker.svg" width="47"> | v29.8.1 |


<br>

## [🗃️ Documentação](docs\README.md)

<p style="text-align: justify;">
A pasta docs/ reúne a documentação técnica e os registros de desenvolvimento do GreenER. Ela contém o planejamento das entregas e das sprints, o Product Backlog, a arquitetura do sistema, a descrição dos cálculos de consumo energético e emissões de CO₂e, além da documentação dos endpoints da API desenvolvida pela equipe.

Esses documentos ajudam a organizar as atividades, acompanhar o progresso, registrar decisões técnicas e manter a rastreabilidade entre os requisitos, as implementações e as entregas do projeto.<br>
A <b>documentação completa</b> pode ser encontrada <a href="https://github.com/greenstackfatec-tech/greener/tree/develop/docs">aqui</a>.
</p>

### Diagramas

| Diagrama | O que mostra |
|----------|--------------|
| [Casos de uso](docs/diagramas/diagrama-casos-de-uso.md) | Atores do sistema e o que cada um pode fazer |
| [Classes](docs/diagramas/diagrama-classes.md) | Classes do domínio (base do banco de dados) e camadas do backend |
| [Sequência](docs/diagramas/diagrama-sequencia.md) | Coleta periódica de métricas, consulta do dashboard e login |

<br>

## ⚙️ Como executar o projeto com Docker

### Pré-requisitos

- Git instalado.
- Docker Desktop no Windows ou Docker Engine com Docker Compose no Linux.
- Docker em execução.

<br>

### 1. Clonar o repositório

```bash
git clone https://github.com/greenstackfatec-tech/greener.git
cd greener
git switch main
```

<br>

### 2. Configurar as variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto a partir do arquivo de exemplo.

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**Linux ou macOS:**

```bash
cp .env.example .env
```

O arquivo `.env.example` contém as configurações iniciais para execução local.

Para habilitar a autenticação JWT, configure a variável `JWT_SECRET` no arquivo `.env`. Gere uma chave com o comando:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Copie o valor gerado para `JWT_SECRET`. Não compartilhe nem versione o arquivo `.env`.

<br>

### 3. Validar a configuração do Docker Compose

Na raiz do repositório, execute:

```bash
docker compose config
```

Esse comando verifica se a configuração do Docker Compose está válida antes da inicialização dos serviços.

<br>

### 4. Construir e iniciar os containers

Execute:

```bash
docker compose up --build -d
```

O Docker Compose constrói as imagens e inicia os seguintes serviços:

- **PostgreSQL:** responsável pela persistência dos dados.
- **Backend:** responsável pelas regras de negócio, integrações, autenticação e coleta de métricas.
- **Frontend:** interface web utilizada para visualizar as informações do sistema.

O backend aguarda o banco de dados ficar saudável antes de iniciar, enquanto o frontend aguarda a disponibilidade do backend.

<br>

### 5. Verificar os serviços

Após a inicialização, acesse a aplicação pelo endereço:

**Frontend:** http://localhost:8080

Os endpoints de verificação do backend são:

| Serviço | Endereço | Resultado esperado |
|---|---|---|
| Frontend | `http://localhost:8080` | Interface do GreenER disponível. |
| Backend | `http://localhost:3000/health/live` | HTTP 200 e `{"status":"ok"}`. |
| Backend e banco | `http://localhost:3000/health/ready` | HTTP 200 e `{"status":"ok","database":"connected"}`. |

Para verificar o estado dos containers, execute:

```bash
docker compose ps
```

Para acompanhar os registros de execução dos serviços:

```bash
docker compose logs -f frontend backend database
```

Os containers devem apresentar o estado `healthy` quando as verificações de saúde forem concluídas com sucesso.

<br>

### 6. Encerrar a aplicação

Para encerrar os serviços, execute:

```bash
docker compose down
```

Esse comando encerra e remove os containers, mas preserva o volume `postgres_data` e os dados persistidos no PostgreSQL.

**Atenção:** não utilize `docker compose down -v` caso queira preservar os dados armazenados no banco.

---
<br>

## 👩‍💻 Nossa Equipe

<table>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/124407006?v=4" width="75px;" alt="Igor Iansen"/>
      </td>
      <td>Igor Iansen</td>
      <td>Product Owner </td>
      <td> <a href="https://github.com/igoriansen" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/igoriansen/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/263787851?v=4" width="75px;" alt="Fernanda Fonseca"/>
      </td>
      <td>Fernanda Fonseca</td>
      <td> Scrum Master </td>
      <td> <a href="https://github.com/fernandafonseca-dev" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/fernanda-fonseca-37b9893b6/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/205100877?v=4" width="75px;" alt="Thiago Souza"/>
      </td>
      <td>Thiago Souza</td>
      <td> Desenvolvedor </td>
      <td> <a href="https://github.com/thiagosantos-17" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>        
         <a href="https://www.linkedin.com/in/thiago-s-7579913b3/?isSelfProfile=false" title="LinkedIn">
         <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> 
      </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/269037770?v=4" width="75px;" alt="Renan Santos"/>
      </td>
      <td>Renan Santos</td>
      <td> Desenvolvedor </td>
      <td> <a href="https://github.com/renanrmsantos14" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/renan-santos-40662738b/?isSelfProfile=true" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/263511136?v=4" width="75px;" alt="Júlia Rodrigues"/>
      </td>
      <td>Guilherme Matos</td>
      <td> Desenvolvedor </td>
      <td> <a href="https://github.com/gm-paiva" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>        <a href="https://www.linkedin.com/in/guilherme-matos-120827365/" title="LinkedIn">
         <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> 
      </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/262029760?v=4" width="75px;" alt="Júlia Rodrigues"/>
      </td>
      <td> Júlia de Oliveira</td>
      <td> Desenvolvedora </td>
      <td> <a href="https://github.com/juliasilverio-dev" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/j%C3%BAlia-silv%C3%A9rio-593b423b9/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
</table>

---

<div align="center">
    <i> Desenvolvido por Green Stack <br>2026</i>
</div>
