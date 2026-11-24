# 📚 Documentação do GreenER

A pasta `docs/` reúne a documentação técnica e os registros de planejamento do **GreenER**, projeto desenvolvido pela equipe **Green Stack** no contexto do ABP II do curso de Desenvolvimento de Software Multiplataforma da FATEC Jacareí.

O objetivo desta documentação é centralizar as decisões técnicas, organizar as entregas e facilitar o acompanhamento do desenvolvimento, mantendo a rastreabilidade entre requisitos, tarefas, implementação e evidências.

## 📂 Estrutura da documentação

```text
docs/
├── README.md
├── plano-de-entregas.md
├── arquitetura.md
├── api.md
├── calculos.md
├── mocks.md
├── sprints/
│   ├── product-backlog.md
│   ├── sprint-1.md
│   ├── sprint-2.md
│   └── sprint-3.md
├── design/
│   └── ...
└── diagramas/
    ├── README.md
    ├── diagrama-casos-de-uso.md
    ├── diagrama-classes.md
    └── diagrama-sequencia.md
```

## 🗂️ Documentos técnicos e de planejamento

| Documento | Finalidade |
|---|---|
| [Plano de Entregas](./plano-de-entregas.md) | Organiza objetivos, entregas, responsáveis, critérios de aceite, evidências e Definition of Done (DoD). |
| [Arquitetura](./arquitetura.md) | Descreve os componentes, a comunicação entre frontend, backend, banco de dados e serviços externos, além do modelo de dados. |
| [Documentação da API](./api.md) | Reúne endpoints, métodos, parâmetros, autenticação, exemplos de resposta e erros. Distingue rotas implementadas de contratos planejados. |
| [Cálculos](./calculos.md) | Registra metodologia, fórmulas, unidades, fatores e premissas para estimar energia e emissões de CO₂e. |
| [Mocks locais](./mocks.md) | Explica os mocks das APIs externas no backend e o mock da API GreenER no frontend, incluindo cenários e comandos de execução. |
| [Product Backlog](./sprints/product-backlog.md) | Centraliza e prioriza requisitos, funcionalidades, melhorias e correções. |
| [Relatório da Sprint 1](./sprints/sprint-1.md) | Registra planejamento, atividades, entregas, evidências e retrospectiva da primeira sprint. |
| [Relatório da Sprint 2](./sprints/sprint-2.md) | Registra planejamento, atividades, entregas, evidências e retrospectiva da segunda sprint. |
| [Relatório da Sprint 3](./sprints/sprint-3.md) | Registra planejamento, atividades, entregas, evidências e retrospectiva da terceira sprint. |

## 📖 Documentação dos módulos

Os READMEs de cada parte do repositório complementam os documentos técnicos:

| Documento | Conteúdo |
|---|---|
| [README principal](../README.md) | Apresentação do produto, funcionalidades, tecnologias, sprints e execução com Docker Compose. |
| [README do frontend](../frontend/README.md) | Rotas e telas, autenticação no navegador, comunicação com o backend, atualização automática, modo mock, responsividade e testes. |
| [README do backend](../backend/README.md) | Módulos, endpoints, autenticação, rotina de coleta, persistência, integrações, variáveis de ambiente e testes. |
| [README do banco de dados](../database/README.md) | Schema, seed, tabelas, relacionamentos, migrações e persistência. |

## 🎨 Recursos visuais

A pasta `design/` reúne os recursos visuais do projeto, incluindo logotipos, ícones, guia de estilo e imagens de referência das interfaces. Esses arquivos apoiam a documentação visual e ajudam a manter a consistência dos elementos gráficos utilizados no GreenER.

O [material de design](./design/) pode ser consultado diretamente na pasta correspondente.

## 📐 Diagramas

Os diagramas de casos de uso, classes e sequência estão na pasta [`diagramas/`](./diagramas/). Eles registram a visão de domínio e os fluxos de referência elaborados durante o desenvolvimento.

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
