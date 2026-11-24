<div align="center">

<img width="180" alt="Logo do GreenER" src="https://raw.githubusercontent.com/greenstackfatec-tech/GreenER/c936a2a0ed724d172b82800ead0b9e01a4578ea6/docs/design/greener-circle-logo.png" />

# GreenER - ABP II

Do consumo computacional ao impacto ambiental.
</div>

<br>

## 📚 SUMÁRIO

[Sobre o Projeto](#-sobre-o-projeto) | [Product Backlog](#-product-backlog) | [Plano de Entregas](#-plano-de-entregas) | [Sprints](#-sprints) | [Tecnologias](#%EF%B8%8F-tecnologias) | [Documentação](#-Documentação) | [Instalação](#️-como-executar-o-projeto-com-docker) | [Equipe](#%E2%80%8D-nossa-equipe)

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
│   │   │   ├── analytics/
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
│   └── README.md
├── database/
│   ├── migrations/
│   ├── README.md
│   ├── schema.sql
│   └── seed.sql
├── docs/
│   ├── design/
│   ├── diagramas/
│   ├── sprints/
│   │   ├── product-backlog.md
│   │   ├── sprint-1.md
│   │   ├── sprint-2.md
│   │   └── sprint-3.md
│   ├── README.md
│   ├── api.md
│   ├── arquitetura.md
│   ├── calculos.md
│   ├── mocks.md
│   └── plano-de-entregas.md
├── frontend/
│   ├── mock-servicos.ts
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
│   │   └── rotas.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── README.md
├── .env.example
├── compose.yaml
├── compose.persistence.yaml
└── README.md
```

<br>

## [📄 Product Backlog](./docs/sprints/product-backlog.md)

O Product Backlog é uma lista dinâmica e priorizada de todos os requisitos, funcionalidades, melhorias e correções necessários para o desenvolvimento de um produto. <br>
O Product Backlog pode ser encontrado [aqui](./docs/sprints/product-backlog.md)

<br>

## [🏆 Plano de Entregas](./docs/plano-de-entregas.md)

 O plano de entregas organiza os objetivos, os itens selecionados, os responsáveis, os critérios de aceite e as evidências de cada sprint. Também deve registrar a Definition of Done (DoD), utilizada para avaliar se uma entrega pode ser considerada concluída.
<br>
O <b>Plano de Entregas</b> pode ser encontrado [aqui](./docs/plano-de-entregas.md)

<br>

## ✨ Funcionalidades

### Monitoramento e indicadores

- Integração com a API de métricas para descobrir e consultar serviços monitorados.
- Coleta manual e rotina automática de coleta.
- Persistência dos serviços, estados e observações de coleta no PostgreSQL.
- Identificação de serviços ativos, indisponíveis, removidos e ativos sem métricas.
- Estimativa de potência, energia e emissão de CO₂e com base nas métricas disponíveis e no fator regional.
- Dashboard com indicadores consolidados e dados da última coleta de cada serviço.
- Atualização automática da interface, com preservação dos últimos dados válidos quando uma consulta falha.

### Análise e visualização

- **Histórico:** consulta de coletas por serviço e período, com visualização da evolução de energia e CO₂e.
- **Ranking:** classificação por consumo energético ou emissão de CO₂e, usando total ou média por coleta, com filtros, ordenação e tendência.
- **Comparação:** comparação de dois a cinco serviços em um mesmo período.
- **Mapa:** globo 3D estilizado que apresenta serviços com latitude e longitude válidas.
- **Filtros:** seleção por serviço, região e período nas telas que compartilham esse contexto.

### Autenticação

- Login integrado ao backend e emissão de JWT.
- Proteção das rotas privadas.
- Tratamento de token ausente, inválido ou expirado.
- Logout no frontend, removendo o token do armazenamento do navegador.

**Limitações conhecidas da versão atual:**

- O cadastro cria a conta com nome, e-mail e senha. Embora o formulário também envie tipo de pessoa e CPF/CNPJ, esses dois campos ainda não são persistidos pelo backend.
- A área administrativa consulta o intervalo de coleta, mas a rota para alterá-lo (`PUT /monitoring-settings`) ainda não está implementada.
- O logout remove o token do navegador. Como o backend não possui endpoint de revogação, o JWT permanece válido até completar sua validade de uma hora.
- O mapa não calcula coordenadas ausentes. Serviços sem latitude ou longitude continuam disponíveis nas demais telas, mas não são plotados.

Os valores apresentados dependem das respostas das APIs e dos registros disponíveis no banco. Dados ausentes são representados como indisponíveis, sem substituição por medições fictícias.

<br>

## 🎯 Sprints

| Sprints | Data | Status | Relatório | Vídeo |
| :---: | :---: | :---: | :--- | :---: |
| 1 | 19/10/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-1.md) | [Ver vídeo](https://youtu.be/gBj58b91ARw) |
| 2 | 09/11/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-2.md) | [Ver vídeo](https://www.youtube.com/watch?v=dAeaiwG0VI0) |
| 3 | 23/11/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-3.md) | [Ver vídeo](https://www.youtube.com/watch?v=8_LDRV6ipf4) |

### Legenda:

- ⬜ : Não iniciado
- ⌛ : Em andamento
- ✅ : Concluído

<br>

## 🎯 Sprint 01: Prototipação, Banco de dados, e APIs

A primeira sprint contempla atividades de prototipação, estruturação do banco de dados e preparação das integrações com as APIs auxiliares. O estado de cada atividade e as evidências correspondentes devem ser consultados no relatório da sprint.
<br>
O <b>Sprint Backlog</b> pode ser encontrado [aqui](./docs/sprints/sprint-1.md)

<br>

## 🎯 Sprint 02: Integração, monitoramento e indicadores ambientais

A segunda sprint tem como objetivo consolidar uma versão funcional do GreenER, integrando a coleta periódica de métricas dos serviços, a persistência dos dados no banco e os cálculos estimados de potência, consumo energético e emissões de CO₂e. Também contempla a implementação da autenticação JWT, dos indicadores ambientais consolidados e do dashboard para visualização dos serviços monitorados, seus estados e respectivos dados. 
<br>
O andamento das atividades, as entregas, as pendências e as evidências podem ser consultados no <b>Relatório da Sprint 2</b>, disponível [aqui](./docs/sprints/sprint-2.md)

<br>

## 🎯 Sprint 3 — Análise, autenticação, visualização e consolidação

A terceira sprint avançou nas rotas e telas de histórico, ranking e comparação, reforçou a autenticação, adicionou o mapa geográfico e ampliou os ajustes de responsividade e qualidade. As atividades, o burndown e as pendências de fechamento estão disponível [aqui](./docs/sprints/sprint-3.md).

<br>

## 🛠️ Tecnologias

| Tecnologia | Versão |
|------------|---------|
| ![My Skills](https://skillicons.dev/icons?i=react) | v19.3|
| ![My Skills](https://skillicons.dev/icons?i=vite) | v8.3 |
| ![My Skills](https://skillicons.dev/icons?i=ts) | v7.0 (backend) · v6.0 (frontend) |
| ![My Skills](https://skillicons.dev/icons?i=nodejs)| v22.16.0 |
|![My Skills](https://skillicons.dev/icons?i=postgres) | v18.3 |
| ![My Skills](https://skillicons.dev/icons?i=figma) | Web|
| ![My Skills](https://skillicons.dev/icons?i=git) | v2.53 |
| ![My Skills](https://skillicons.dev/icons?i=github) | Web |
| ![My Skills](https://skillicons.dev/icons?i=docker) | v29.8.1 |


<br>

## [🗃️ Documentação](./docs/README.md)

A pasta docs/ reúne a documentação técnica e os registros de desenvolvimento do GreenER. Ela contém o planejamento das entregas e das sprints, o Product Backlog, a arquitetura do sistema, a descrição dos cálculos de consumo energético e emissões de CO₂e, além da documentação dos endpoints da API desenvolvida pela equipe.

Esses documentos ajudam a organizar as atividades, acompanhar o progresso, registrar decisões técnicas e manter a rastreabilidade entre os requisitos, as implementações e as entregas do projeto.<br>
A <b>documentação completa</b> pode ser encontrada [aqui](./docs/README.md)

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

O exemplo já inclui um `JWT_SECRET` exclusivo de desenvolvimento para permitir o login local. Fora desse ambiente, substitua-o por uma chave própria, gerada com o comando:

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
      <td> <a href="https://github.com/igoriansen" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/igoriansen/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/263787851?v=4" width="75px;" alt="Fernanda Fonseca"/>
      </td>
      <td>Fernanda Fonseca</td>
      <td> Scrum Master </td>
      <td> <a href="https://github.com/fernandafonseca-dev" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/fernanda-fonseca-37b9893b6/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/205100877?v=4" width="75px;" alt="Thiago Souza"/>
      </td>
      <td>Thiago Souza</td>
      <td> Desenvolvedor </td>
      <td> <a href="https://github.com/thiagosantos-17" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
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
      <td> <a href="https://github.com/renanrmsantos14" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/renan-santos-40662738b/?isSelfProfile=true" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/263511136?v=4" width="75px;" alt="Júlia Rodrigues"/>
      </td>
      <td>Guilherme Matos</td>
      <td> Desenvolvedor </td>
      <td> <a href="https://github.com/gm-paiva" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
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
      <td> <a href="https://github.com/juliasilverio-dev" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/> </a></td>
      <td>  <a href="https://www.linkedin.com/in/j%C3%BAlia-silv%C3%A9rio-593b423b9/" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
   </tr>
</table>

---

<div align="center">
    <i> Desenvolvido por Green Stack <br>2026</i>
</div>
