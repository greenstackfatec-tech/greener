<<<<<<< HEAD
<div align="center">

<img width="180" alt="Logo do GreenER" src="https://raw.githubusercontent.com/greenstackfatec-tech/GreenER/c936a2a0ed724d172b82800ead0b9e01a4578ea6/docs/design/greener-circle-logo.png" />

# GreenER - ABP II

Do consumo computacional ao impacto ambiental.
</div>

<br>

## 📚 SUMÁRIO

[Sobre o Projeto](#-sobre-o-projeto) | [Product Backlog](#-product-backlog) | [Plano de Entregas](#-plano-de-entregas) | [Sprints](#-sprints) | [Tecnologias](#%EF%B8%8F-tecnologias) | [Documentação](#-documentação) | [Instalação](#️-como-executar-o-projeto-com-docker) | [Equipe](#%E2%80%8D-nossa-equipe)
=======
 <div align="center">
<img width="200" height="200" alt="icon-greener" src="https://raw.githubusercontent.com/greenstackfatec-tech/GreenER/c936a2a0ed724d172b82800ead0b9e01a4578ea6/docs/design/greener-circle-logo.png" />

# GreenER - ABP II

<br><br>

## 📚 SUMÁRIO

[Sobre o Projeto](#sobre-o-projeto) | [Product Backlog](#product-backlog) | [Cronograma](#cronograma) | [Sprints](#sprints) | [Tecnologias](#tecnologias) | [Documentação](#documentacao) | [Instalação](#instalacao) | [Equipe](#equipe)

</div>
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

<br>

<a id="sobre-o-projeto"></a>
## 📌 Sobre o projeto

<p style="text-align: justify;">
  <b>GreenER</b> é uma plataforma web desenvolvida pela equipe <b>Green Stack</b> com o objetivo de estimar o impacto ambiental de aplicações de software a partir de métricas de infraestrutura. Em vez de medir diretamente o consumo elétrico de um servidor, o sistema utiliza informações como o uso de CPU, memória RAM, disco e rede para estimar o consumo energético da aplicação. Em seguida, essas estimativas são combinadas com dados da intensidade de carbono da matriz elétrica da região onde o serviço está hospedado, produzindo indicadores de emissão de CO₂ equivalente (CO₂e).
</p>

<br>

<a id="desafio"></a>
## 🏅 Desafio

<p style="text-align: justify;">
  O objetivo do sistema é desenvolver uma solução capaz de coletar métricas de serviços, processar essas informações e gerar indicadores ambientais que auxiliem na compreensão do impacto da computação moderna. Mais do que construir uma aplicação, a meta é explorar um dos temas que provavelmente acompanhará a engenharia de software nas próximas décadas: desenvolver sistemas cada vez mais eficientes, conscientes e sustentáveis.
</p>

<br>

<a id="estrutura-do-projeto"></a>
## 🧱 Estrutura do projeto

```text
greener/
├── README.md
├── .env.example
├── compose.yaml
├── frontend/
│   ├── README.md
│   ├── Dockerfile
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── contexts/
│       └── providers/
├── backend/
<<<<<<< HEAD
│   ├── README.md 
│   ├── Dockerfile 
│   └── src/ 
│       ├── app.ts 
│       ├── server.ts 
│       ├── db/ 
│       │   └── connection.ts 
│       ├── integrations/ 
│       │   ├── metrics-api.ts 
│       │   └── carbon-api.ts 
│       └── modules/ 
│           └── coletas/ 
│               ├── coletas.routes.ts 
│               ├── coletas.controller.ts 
│               ├── coletas.service.ts 
│               └── coletas.repository.ts 
├── database/ 
│   ├── README.md 
│   └── schema.sql 
└── docs/
    ├── README.md
    ├── plano-de-entregas.md
    ├── arquitetura.md 
    ├── calculos.md 
    ├── api.md 
    └── sprints/ 
        ├── sprint-1.md 
        ├── sprint-2.md 
        └── sprint-3.md
    └── design/
        ├── greener-circle-logo.png
        ├── greener-icon.png
        ├── greener-styleguide.png
        ├── greenstack-icon.png
        └── ...
=======
│   ├── README.md
│   ├── Dockerfile
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── db/
│       │   └── connection.ts
│       ├── integrations/
│       │   ├── metrics-api.ts
│       │   └── carbon-api.ts
│       └── modules/
│           └── coletas/
│               ├── coletas.routes.ts
│               ├── coletas.controller.ts
│               ├── coletas.service.ts
│               └── coletas.repository.ts
├── database/
│   ├── README.md
│   └── schema.sql
└── docs/
    ├── plano-de-entregas.md
    ├── arquitetura.md
    ├── calculos.md
    ├── api.md
    └── sprints/
        ├── sprint-1.md
        ├── sprint-2.md
        └── sprint-3.md
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e
```

<br>

<a id="product-backlog"></a>
## 📄 Product Backlog

<p style="text-align: justify;">
  O Product Backlog é uma lista dinâmica e priorizada de todos os requisitos, funcionalidades, melhorias e correções necessários ao desenvolvimento de um produto.<br>
  O <b>Product Backlog</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/sprints/product-backlog.md">aqui</a>.
</p>

<br>

<a id="plano-de-entregas"></a>
## 🏆 Plano de Entregas

<p style="text-align: justify;">
<<<<<<< HEAD
 O plano de entregas organiza os objetivos, os itens selecionados, os responsáveis, os critérios de aceite e as evidências de cada sprint. Também deve registrar a Definition of Done (DoD), utilizada para avaliar se uma entrega pode ser considerada concluída.
<br>
O <b>Plano de Entregas</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/plano%20de%20entregas.md">aqui</a>.
</p>

<br>
  
## 🎯 Sprints

| Sprints | Data | Stauts | Relatório | Vídeo |
| :---: | :---: | :---: | :--- | :---: |
| 1 | 19/10/2026 | ✅ | [Ver relatório](./docs/sprints/sprint-1.md) | [Ver vídeo](#) |
| 2 |     --     | ⬜ | [Indisponível]() | [Indisponível](#) |
| 3 |     --     | ⬜ | [Indisponível]() | [Indisponível](#) |
=======
  (Descrição do plano de entregas.)<br>
  O <b>DoD</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/plano%20de%20entregas.md">aqui</a>.
</p>

<br>

<a id="cronograma"></a>
## 📈 Cronograma de evolução do projeto

``` A ser implementado ```

<br>

<a id="sprints"></a>
## 🎯 Sprints

| Sprints | Data | Status | Relatório | Vídeo |
| :---: | :---: | :---: | :--- | :---: |
| 1 | 28/09/2026 | ⌛ | [Ver relatório](./docs/sprints/sprint-1.md) | [Ver vídeo](#) |
| 2 | 19/10/2026 | ⬜ | [Ver relatório]() | [Ver vídeo](#) |
| 3 | 09/11/2026 | ⬜ | [Ver relatório]() | [Ver vídeo](#) |
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

### Legenda:

- ⬜ : Não iniciado
- ⌛ : Em andamento
- ✅ : Concluído

<br>

<<<<<<< HEAD
## 🎯 Sprint 01: Prototipação, Banco de dados, e APIs

<p style="text-align: justify;">
A primeira sprint contempla atividades de prototipação, estruturação do banco de dados e preparação das integrações com as APIs auxiliares. O estado de cada atividade e as evidências correspondentes devem ser consultados no relatório da sprint.
<br>
O <b>Sprint Backlog</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/sprints/sprint-1.md">aqui</a>.
=======
<a id="sprint-01"></a>
## 🎯 Sprint 01: Prototipação, estruturação do banco de dados e implementação das APIs

<p style="text-align: justify;">
  (Detalhes da sprint.)<br>
  O <b>Sprint Backlog</b> pode ser encontrado <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/sprints/sprint-1.md">aqui</a>.
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e
</p>

<br>

<a id="tecnologias"></a>
## 🛠️ Tecnologias

| Tecnologia | Versão |
|------------|---------|
| ![My Skills](https://skillicons.dev/icons?i=ts) | v7.0 |
| ![My Skills](https://skillicons.dev/icons?i=nodejs) | v22.16.0 |
| ![My Skills](https://skillicons.dev/icons?i=postgres) | v18.3 |
| ![My Skills](https://skillicons.dev/icons?i=html) | HTML5 |
| ![My Skills](https://skillicons.dev/icons?i=css) | CSS3 |
| ![My Skills](https://skillicons.dev/icons?i=figma) | Web |
| ![My Skills](https://skillicons.dev/icons?i=git) | v2.53 |
| ![My Skills](https://skillicons.dev/icons?i=github) | Web |
| <img src="https://github.com/tandpfun/skill-icons/blob/main/icons/Docker.svg" width="47"> | v29.8.1 |


<br>

<<<<<<< HEAD
## [🗃️ Documentação](https://github.com/greenstackfatec-tech/greener/tree/develop/docs)

<p style="text-align: justify;">
A pasta docs/ reúne a documentação técnica e os registros de desenvolvimento do GreenER. Ela contém o planejamento das entregas e das sprints, o Product Backlog, a arquitetura do sistema, a descrição dos cálculos de consumo energético e emissões de CO₂e, além da documentação dos endpoints da API desenvolvida pela equipe.

Esses documentos ajudam a organizar as atividades, acompanhar o progresso, registrar decisões técnicas e manter a rastreabilidade entre os requisitos, as implementações e as entregas do projeto.<br>
A <b>documentação completa</b> pode ser encontrada <a href="https://github.com/greenstackfatec-tech/greener/tree/develop/docs">aqui</a>.
=======
<a id="documentacao"></a>
## 🗃️ Documentação

<p style="text-align: justify;">
  A documentação do projeto inclui o modelo lógico do banco de dados, os diagramas de casos de uso e de sequência, além dos artefatos do Scrum (Product Backlog e Sprint Backlog) e dos relatórios de cada sprint.<br>
  A <b>documentação completa</b> pode ser encontrada <a href="#">aqui</a>.
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e
</p>
<br>

<<<<<<< HEAD
## ⚙️ Como executar o projeto com Docker

### Pré-requisitos

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) no Windows ou macOS, ou Docker Engine com o plugin Docker Compose no Linux.
- Docker em execução no computador.

Não é necessário instalar Node.js ou PostgreSQL diretamente na máquina para executar serviços que estejam configurados corretamente em containers.

### 1. Clonar o repositório e acessar a branch `develop`
=======
<a id="requisitos"></a>
## 📋 Requisitos

### Requisitos Funcionais (RF)

Os requisitos funcionais são especificações detalhadas que definem o que um sistema deve fazer, descrevendo suas funcionalidades e seus comportamentos.

<br>

Eles podem ser encontrados <a href="#">aqui</a>.

### Requisitos Não Funcionais (RNF)

Os requisitos não funcionais definem como um sistema opera. Eles estabelecem critérios de qualidade, restrições e atributos como desempenho, segurança, usabilidade e confiabilidade.

<br>

Eles podem ser encontrados <a href="#">aqui</a>.

### Restrição do Projeto (RP)

As restrições de um projeto são limitações, fatores externos ou imposições que condicionam seu planejamento, sua execução e sua conclusão, definindo o que pode ser realisticamente entregue.

<br>

Eles podem ser encontrados <a href="#">aqui</a>.

<br>

<a id="instalacao"></a>
## ⚙️ Como executar o projeto

### 🛠️ Pré-requisitos

- Git ([Download](https://git-scm.com/downloads)) - v. 2.53.0
- Node.js ([Download](https://nodejs.org/en/download)) - v. 24.13.1
- PgAdmin ([Download](https://www.pgadmin.org/download/))

---

### 1. Clonar o repositório principal
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
git clone https://github.com/greenstackfatec-tech/greener.git
cd greener
git switch develop
```

<<<<<<< HEAD
### 2. Configurar as variáveis de ambiente
=======
> **Observação:** Para o banco de dados funcionar, clone o repositório na pasta raiz do seu computador.
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

Confira as variáveis documentadas no arquivo `.env.example`. Se o projeto utilizar um arquivo `.env` na raiz, crie-o a partir do exemplo:

**Windows (PowerShell):**

<<<<<<< HEAD
```powershell
Copy-Item .env.example .env
```

**Linux ou macOS:**
=======
**1º** Entre na pasta `GreenER`:
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
cp .env.example .env
```

<<<<<<< HEAD
Preencha os valores exigidos pelo projeto. Não compartilhe nem versione senhas, tokens ou outras credenciais reais.
=======
> **Observação:**
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

### 3. Validar a configuração do Docker Compose

<<<<<<< HEAD
Na raiz do repositório, execute:
=======
**2º** Instale as bibliotecas com o comando:
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
docker compose config
```

Esse comando valida a configuração do Compose. Se apresentar erro, corrija o `compose.yaml` e as variáveis necessárias antes de continuar.

<<<<<<< HEAD
### 4. Construir e iniciar os containers

Depois que `compose.yaml`, os Dockerfiles e as variáveis de ambiente estiverem configurados:
=======
**3º** Com o repositório na pasta raiz do computador, inicialize o banco de dados:
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
docker compose up --build
```

<<<<<<< HEAD
Para executar em segundo plano:
=======
<br>

**4º** Por fim, execute o projeto:
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
docker compose up --build -d
```

### 5. Verificar os serviços

<<<<<<< HEAD
Consulte o estado dos containers:
=======
**Saída esperada:**
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e

```bash
docker compose ps
```

Para acompanhar os logs:

```bash
docker compose logs -f
```

Quando os serviços estiverem prontos, acesse os endereços locais definidos nas configurações do Compose. As portas do frontend, backend e banco devem ser conferidas no `compose.yaml`; não presuma que a aplicação estará disponível em uma porta específica.

### 6. Encerrar a aplicação

```bash
docker compose down
```

Esse comando encerra e remove os containers da aplicação. Não utilize `docker compose down -v` se quiser preservar os volumes e os dados persistidos do PostgreSQL.

<br>

<a id="equipe"></a>
## 👩‍💻 Nossa equipe

<table>
<<<<<<< HEAD
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
=======
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/124407006?v=4" width="75px;" alt="Igor Iansen"/>
    </td>
    <td>Igor Iansen</td>
    <td>Product Owner</td>
    <td><a href="https://github.com/igoriansen" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="https://www.linkedin.com/in/igoriansen/" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/263787851?v=4" width="75px;" alt="Fernanda Fonseca"/>
    </td>
    <td>Fernanda Fonseca</td>
    <td>Scrum Master</td>
    <td><a href="https://github.com/fernandafonseca-dev" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="https://www.linkedin.com/in/fernanda-fonseca-37b9893b6/" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/205100877?v=4" width="75px;" alt="Thiago Souza"/>
    </td>
    <td>Thiago Souza</td>
    <td>Desenvolvedor</td>
    <td><a href="https://github.com/thiagosantos-17" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="#" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/269037770?v=4" width="75px;" alt="Renan Santos"/>
    </td>
    <td>Renan Santos</td>
    <td>Desenvolvedor</td>
    <td><a href="https://github.com/renanrmsantos14" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="https://www.linkedin.com/in/renan-santos-40662738b/?isSelfProfile=true" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/263511136?v=4" width="75px;" alt="Guilherme Matos"/>
    </td>
    <td>Guilherme Matos</td>
    <td>Desenvolvedor</td>
    <td><a href="https://github.com/gm-paiva" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="https://www.linkedin.com/in/guilherme-matos-120827365/" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
  <tr>
    <td>
      <img src="https://avatars.githubusercontent.com/u/262029760?v=4" width="75px;" alt="Júlia Rodrigues"/>
    </td>
    <td>Júlia de Oliveira</td>
    <td>Desenvolvedora</td>
    <td><a href="https://github.com/juliasilverio-dev" title="GitHub"><img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a></td>
    <td><a href="https://www.linkedin.com/in/j%C3%BAlia-silv%C3%A9rio-593b423b9/" title="LinkedIn"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a></td>
  </tr>
>>>>>>> d07644ff70ef68f637f360c4c2daa9ae16eaf02e
</table>

---

<div align="center">
  <i>Desenvolvido por Green Stack<br>2026</i>
</div>
