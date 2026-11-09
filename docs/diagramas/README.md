# Diagramas

← [Voltar à documentação](../README.md)

Diagramas UML do GreenER, escritos em [Mermaid](https://mermaid.js.org/). O GitHub desenha os diagramas direto na página do arquivo.

| Diagrama | Tarefa | O que mostra |
| --- | --- | --- |
| [Casos de uso](diagrama-casos-de-uso.md) | ES-001 | Atores (visitante, perfis de usuário, rotina de coleta e APIs externas) e o que cada um faz no sistema |
| [Classes](diagrama-classes.md) | DW-003 | Classes do domínio (base do banco de dados) e classes do backend em camadas |
| [Sequência](diagrama-sequencia.md) | DW-003.1 | Coleta periódica de métricas, consulta do dashboard e login |

O modelo lógico do banco está em [`database/modelagem_bd.png`](../../database/modelagem_bd.png).

## Como editar

1. Abra o arquivo `.md` e altere o bloco ` ```mermaid `.
2. Para ver o resultado antes do commit, cole o bloco em [mermaid.live](https://mermaid.live) ou use a pré-visualização Markdown do VS Code.
3. Registre a mudança no histórico de alterações do arquivo.
