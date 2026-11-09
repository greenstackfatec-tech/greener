# Sprint 1

←  [Voltar ao README](../../README.md)

## 📝 Relatório da Sprint
<p style="text-align: justify;">
Nesta sprint, a equipe focou na base do projeto. Foram definidas a identidade visual e prototipadas as telas essenciais do produto (início, login, cadastro CPF e CNPJ, colaboradores, administração e not found), em versões desktop e mobile. Em paralelo, o banco de dados foi modelado e implementado em PostgreSQL com Docker, as integrações com as APIs do cliente (Agregador de Métricas e Intensidade de Carbono) foram iniciadas no back-end e a documentação do projeto foi estruturada, incluindo os diagramas de casos de uso, classes e sequência.
</p>

<br>

## 💻 Demonstração do Produto
> Clique na imagem abaixo para assistir ao vídeo referente à primeira sprint.

[Sprint 1 - GreenER](https://youtu.be/gBj58b91ARw)

<br>

## 📢 Retrospectiva

#### 1. O que funcionou bem
- Entrega do escopo: todas as tarefas do Sprint Backlog foram concluídas, e o burndown fechou a sprint zerado. As demais tarefas previstas para a Sprint 1 no Product Backlog (backend, frontend, Docker e coleta) foram replanejadas para a Sprint 2.

- Colaboração: os integrantes se ajudaram nas tarefas e revisões, mesmo com ausências pontuais ao longo da sprint.

#### 2. O que não funcionou bem
- Atraso no início: entre 07/10 e 12/10 o realizado ficou acima da linha ideal, porque parte das tarefas dependia de outras entregas para começar.

- Assimetria de commits: a quantidade de commits ficou desigual entre os integrantes, pois algumas funções geram menos histórico no repositório.

- Entregas finais em cima da hora: o vídeo da review e os últimos ajustes de documentação foram concluídos perto do prazo.

#### 3. Plano de Ação para a Próxima Sprint
- Rotação de tarefas: alternar os tipos de atividade entre os integrantes para equilibrar o conhecimento e os commits.

- Dependências no Planning: mapear quais tarefas dependem de outras para que ninguém fique parado esperando uma entrega.

- Antecipar a review: definir roteiro, gravações e responsável pelo vídeo no início da última semana da sprint.

<br>

## 📉 Burndown

```mermaid
---
config:
  themeVariables:
    xyChart:
      plotColorPalette: "#4472C4, #ED7D31"
---
xychart-beta
    title "Burndown – Sprint 1"
    x-axis ["05/10", "06/10", "07/10", "08/10", "09/10", "12/10", "13/10", "14/10", "15/10", "16/10", "19/10"]
    y-axis "Pontos restantes" 0 --> 140
    line [118, 106, 94, 82, 70, 58, 46, 34, 22, 10, 0]
    line [110, 107, 107, 94, 84, 80, 50, 32, 24, 18, 0]
```
<br>

**Legenda:** 

🟦 Base Line (ritmo ideal) <br>
🟧 Realizado

<br>

## 🗃️ Documentos
<details>
<summary>

### 📋 Sprint Backlog
</summary>

<br>

| ID | Atividade | Prioridade | Pontuação | Disciplina | Andamento | Autor |
|---|---|---:|---:|---|---|---|
| BD-001 | Modelagem do banco de dados lógico | 7 | 8 | BD | ✅ Concluído | Thiago |
| DD-001 | Criar o design da tela de cadastro CNPJ | 9 | 3 | DD | ✅ Concluído | Guilherme |
| DD-001.1 | Criar o design da tela de cadastro CNPJ mobile | 9 | 3 | DD | ✅ Concluído | Guilherme |
| DD-001 | Criar o design da tela de cadastro CPF | 9 | 1 | DD | ✅ Concluído | Guilherme |
| DD-001.1 | Criar o design da tela de cadastro CPF mobile | 9 | 1 | DD | ✅ Concluído | Thiago |
| DD-002 | Criar o design da tela de login | 9 | 3 | DD | ✅ Concluído | Renan |
| DD-002.1 | Criar o design da tela de login mobile | 9 | 3 | DD | ✅ Concluído | Renan |
| DD-003 | Criar o design da homepage | 9 | 5 | DD | ✅ Concluído | Thiago |
| DD-003.1 | Criar o design da homepage mobile | 9 | 5 | DD | ✅ Concluído | Thiago |
| DD-004 | Criar o design da tela de início | 9 | 5 | DD | ✅ Concluído | Igor |
| DD-004 | Criar o design da tela de início mobile | 9 | 5 | DD | ✅ Concluído | Igor |
| DD-004.1 | Tela colaboradores | 8 | 3 | DD | ✅ Concluído | Julia |
| DD-004.1 | Tela colaboradores mobile | 8 | 3 | DD | ✅ Concluído | Julia |
| DD-005 | Definir paleta de cores | 10 | 1 | DD | ✅ Concluído | Todos |
| DD-004 | Criar o design da tela not found | 7 | 3 | DD | ✅ Concluído | Guilherme |
| DD-004 | Criar o design da tela not found mobile | 7 | 3 | DD | ✅ Concluído | Renan |
| DD-006 | Criar logo para o projeto | 9 | 1 | DD | ✅ Concluído | Guilherme |
| DD-007 | Criar logo para a equipe | 9 | 1 | DD | ✅ Concluído | Renan |
| DW-002 | Conectar Greener Metrics Aggregator API | 8 | 8 | DW | ✅ Concluído | Julia |
| DW-002.1 | Conectar Greener Carbon Intensity API | 8 | 5 | DW | ✅ Concluído | Julia |
| DW-003 | Desenvolver diagrama de classes | 8 | 8 | DW | ✅ Concluído | Fernanda |
| DW-003.1 | Desenvolver diagrama de sequência | 8 | 8 | DW | ✅ Concluído | Guilherme |
| DW-004 | Criar README.md principal | 10 | 3 | DW | ✅ Concluído | Fernanda |
| ES-001 | Desenvolver diagrama de caso de uso | 8 | 8 | EWS | ✅ Concluído | Fernanda |
| ES-002 | Documentar requisitos e backlog | 10 | 8 | EWS | ✅ Concluído | Igor |
| LP-001 | Carregar dados no SGBD | 7 | 3 | LPA | ✅ Concluído | Renan |
</details>

<details>
<summary>

### 📊 Pontos por dia
</summary>

<br>

| Dia | Base Line | Realizado |
|---|---:|---:|
| 05/10 | 118 | 110 |
| 06/10 | 106 | 107 |
| 07/10 | 94 | 107 |
| 08/10 | 82 | 94 |
| 09/10 | 70 | 84 |
| 12/10 | 58 | 80 |
| 13/10 | 46 | 50 |
| 14/10 | 34 | 32 |
| 15/10 | 22 | 24 |
| 16/10 | 10 | 18 |
| 19/10 | 0 | 0 |
</details>

<details>
<summary>

### 🗒️ Atas das Daily Meetings
</summary>

<br>

| Dia | Data | Renan | Igor | Júlia | Guilherme | Thiago | Fernanda | Obs. |
|---:|---|---|---|---|---|---|---|---|
| 1 | 05/10 (seg) | Discussão sobre o que seria desenvolvido, divisão das tarefas e definição do nome da equipe | Criação do Product Backlog e do Sprint Backlog | Discussão sobre o que seria desenvolvido, divisão das tarefas e definição do nome da equipe | Discussão sobre o que seria desenvolvido, divisão das tarefas e definição do nome da equipe | Discussão sobre o que seria desenvolvido, divisão das tarefas e definição do nome da equipe | Discussão sobre o que seria desenvolvido, divisão das tarefas e definição do nome da equipe | Todos participaram. Não foram registrados impedimentos ou avisos. |
| 2 | 06/10 (ter) | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Definição da paleta de cores e tipografia, início da prototipação e discussão sobre as logos do projeto e da equipe | Todos participaram. Não foram registrados impedimentos ou avisos. |
| 3 | 07/10 (qua) | Criação da logo da equipe | Desenvolvimento da prototipação | Finalização das telas de colaboradores e cadastro | Finalização das telas de colaboradores e cadastro | Desenvolvimento da prototipação | Documentação e gestão do GitHub | Impedimento registrado: Feitec. |
| 4 | 08/10 (qui) | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Impedimento registrado: Feitec. |
| 5 | 09/10 (sex) | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Finalização da tela de início | Desenvolvimento da prototipação | Não foram registrados impedimentos ou avisos. |
| 6 | 12/10 (seg) | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Desenvolvimento da prototipação | Início do desenvolvimento da modelagem do banco de dados | Desenvolvimento da prototipação | O PDF registra feriado como impedimento para Renan, Igor, Júlia, Guilherme e Fernanda. Para Thiago, não há impedimento registrado. |
| 7 | 13/10 (ter) | Finalização da tela Not Found (404) mobile e das telas de login | Finalização das telas de administrador | Início da conexão com as APIs | Finalização da tela Not Found (404) desktop | Finalização da modelagem do banco de dados e da tela de cadastro CPF mobile | Criação da logo secundária para casos específicos e estruturação inicial do README.md | Não foram registrados impedimentos ou avisos. |
| 8 | 14/10 (qua) | Início do código SQL | Análise e aprovação dos documentos entregues pela equipe | Finalização da conexão com as APIs | Criação do arquivo do Plano de Entregas | README.md do database e modificações nas documentações | Alterações nas documentações e correção da estrutura de pastas | Não foram registrados impedimentos ou avisos. |
| 9 | 15/10 (qui) | Análise e finalização das documentações necessárias para a entrega | Análise e finalização das documentações necessárias para a entrega | Análise e finalização das documentações necessárias para a entrega | Análise e finalização das documentações necessárias para a entrega | Análise e finalização das documentações necessárias para a entrega | Análise e finalização das documentações necessárias para a entrega | Todos participaram da análise e finalização das documentações. Não foram registrados impedimentos ou avisos. |
| 10 | 16/10 (sex) | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Definição do conteúdo do vídeo e edição das falas e imagens para a entrega da primeira Sprint | Todos participaram. Não foram registrados impedimentos ou avisos. |

</details>
