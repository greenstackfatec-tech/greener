<div align="center">
<img width="200" height="200" alt="icon-greener" src="https://raw.githubusercontent.com/greenstackfatec-tech/GreenER/c936a2a0ed724d172b82800ead0b9e01a4578ea6/docs/design/greener-circle-logo.png" />
  
# GreenER - ABP II
<br>

<img src="#" />
<img src="#" />
<img src="#" />

<br><br>

## 📚 SUMÁRIO

[Sobre o Projeto](#-sobre-o-projeto) | [Product Backlog](#-product-backlog) | [Cronograma ](#-product-backlog) | [Sprints](#-sprints) | [Tecnologias](#%EF%B8%8F-tecnologias) | [Documentação](#-requisitos) | [Instalação](%EF%B8%8F-como-executar-o-projeto) | [Equipe](#%E2%80%8D-nossa-equipe)

</div>

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
├── README.md 
├── .env.example 
├── compose.yaml 
├── frontend/ 
│   ├── README.md 
│   ├── Dockerfile 
│   └── src/ 
│       ├── components/ 
│       ├── pages/ 
│       ├── services / 
│       ├── hooks / 
│       ├── contexts / 
│       └── providers/ 
├── backend/
│   ├── README.md 
│   ├── Dockerfile 
│   └── src/ 
│       ├── app.ts 
│       ├── server.ts 
│       ├── db/ 
│       │   └── connection.ts 
│       ├── integrations/ 
│       │   ├── api-client.ts
        │   ├── carbon-api.ts  
│       │   └── metrics-api.ts  
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
```

<br>

## [📄 Product Backlog](#)

<p style="text-align: justify;">
O Product Backlog é uma lista dinâmica e priorizada de todos os requisitos, funcionalidades, melhorias e correções necessários para o desenvolvimento de um produto.<br>
O <b>Product Backlog</b> pode ser encontrado <a href="#">aqui</a>.
</p>

<br>

## [🏆 Definição de Pronto (DoD)](#)

<p style="text-align: justify;">
A Definition of Done (DoD), é um acordo entre a equipe que estabelece os critérios de qualidade e requisitos técnicos necessários para considerar um item do backlog totalmente concluído.
<br>
O <b>DoD</b> pode ser encontrado <a href="#">aqui</a>.
</p>

<br>

## 📈 Cronograma de Evolução do projeto

<img width="100%" alt="cronograma-evolucao-projeto" src="#1" />

<br>
  
## 🎯 Sprints

| Sprints | Data       | Stauts | Relatório                                                                                                      | Vídeo         |
| ------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------- |
| 1       | 13/04/2026 |   ⌛   | [Ver relatório](#) | [Ver vídeo](#) |
| 2       | 04/05/2026 |   ⬜   | [Ver relatório](#) | [Ver vídeo](#) |
| 3       | 25/05/2026 |   ⬜   | [Ver relatório](#) | [Ver vídeo](#) |

### Legenda:

- ⬜ : Não iniciado
- ⌛ : Em andamento
- ✅ : Concluído

<br>

## 🎯 Sprint 01: Prototipação, Estruturação do banco de dados, e Implementação das APIs

<p style="text-align: justify;">
(Detalhes da sprint)
<br>
O <b>Sprint Backlog</b> pode ser encontrado <a href="#">aqui</a>.
</p>

<br>

## 🎯 Sprint 02:
<p style="text-align: justify;">
(Detalhes da sprint)
<br>
O <b>Sprint Backlog</b> pode ser encontrado <a href="#">aqui</a>.
</p>

<br>

## 🎯 Sprint 03:

<p style="text-align: justify;">
(Detalhes da sprint)
<br>
O <b>Sprint Backlog</b> pode ser encontrado <a href="#">aqui</a>.
</p>

<br>

## 🛠️ Tecnologias

| Tecnologia | Versão |
|------------|---------|
| ![My Skills](https://skillicons.dev/icons?i=js) | ES2023 |
| ![My Skills](https://skillicons.dev/icons?i=nodejs)| v22.16.0 |
|![My Skills](https://skillicons.dev/icons?i=postgres) | v18.3 |
| ![My Skills](https://skillicons.dev/icons?i=html)| HTML5 |
| ![My Skills](https://skillicons.dev/icons?i=css) | CSS3 |
| ![My Skills](https://skillicons.dev/icons?i=figma) | Web|
| ![My Skills](https://skillicons.dev/icons?i=git) | v2.53 |
| ![My Skills](https://skillicons.dev/icons?i=github) | Web |

<br>

## [🗃️ Documentação](#)

<p style="text-align: justify;">
A documentação do projeto inclui o modelo lógico do banco de dados, os diagramas de caso de uso e de sequência, além dos artefatos do Scrum (Product Backlog e Sprint Backlog) e dos relatórios de cada sprint.<br>
A <b>documentação completa</b> pode ser encontrada <a href="#">aqui</a>.
</p>

<br>

## [📋 Requisitos](#)

### [Requisitos Funcionais (RF)](#)

Os Requisitos funcionais são especificações detalhadas que definem o que um sistema deve fazer, descrevendo funcionalidades e comportamentos.
<br>
Eles podem ser encontrados <a href="#">aqui</a>.

### [Requisitos Não Funcionais (RNF)](#)

Os Requisitos não funcionais definem como um sistema opera. Eles estabelecem critérios de qualidade, restrições e atributos como desempenho, segurança, usabilidade e confiabilidade.
<br>
Eles podem ser encontrados <a href="#">aqui</a>.

### [Restrição do Projeto (RP)](#)

Restrições de um projeto são limitações, fatores externos ou imposições que condicionam o planejamento, execução e conclusão, definindo o que pode ser realista entregue.
<br>
Eles podem ser encontrados <a href="#">aqui</a>.

<br>

## ⚙️ Como executar o projeto

### 🛠 Pré-requisitos

- Git ([Download](https://git-scm.com/downloads)) - v. 2.53.0

- Node.js ([Download](https://nodejs.org/en/download)) - v. 24.13.1

- PgAdmin ([Download](https://www.pgadmin.org/download/))

---

### 1. Clonar o Repositório Principal

```bash
git clone https://github.com/greenstackfatec-tech/GreenER.git
```

> **Observação:** Para o banco de dados funcionar, clone o repositório na pasta raíz do seu computador.

---

### 2. Configuração do projeto

**1°** Entre na pasta `GreenER`:

```bash
cd GreenER
```

> **Observação:** 

<br>

**2°** Instale as bibliotecas com o comando:

```bash
npm i
```

<br>

**3°** Com o repositório em sua pasta raíz, inicialize o banco de dados:

```bash
npm run db:init
```

<br>

**4°** Por fim, execute o projeto:

```bash
npm run start
```

---

**Saída Esperada:**
<br>

Servidor rodando em `http://localhost:3000`

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
         <a href="#" title="LinkedIn">
         <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> 
      </td>
   </tr>
   <tr>
      <td>
         <img src="https://avatars.githubusercontent.com/u/269037770?v=4" width="75px;" alt="Renan Santos"/>
      </td>
      <td>Renan Santos</td>
      <td> Desenvolvedora </td>
      <td> <a href="https://github.com/renanrmsantos14" title="GitHub"> <img src="https://img.shields.io/badge/GitHub-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="LinkedIn"/> </a></td>
      <td>  <a href="#" title="LinkedIn"> <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/> </a> </td>
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

