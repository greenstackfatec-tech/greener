# Plano de Entregas — GreenER

← [Voltar ao README](../README.md) · [Product Backlog](./sprints/product-backlog.md)

**Projeto:** GreenER · **Equipe:** Green Stack · **Curso:** DSM — FATEC Jacareí  
**Atualização:** 09/11/2026  
**Documento de referência:** RP07 — Plano de entregas e Definition of Done (DoD)

---

## 1. Objetivo e regras de acompanhamento

Este documento organiza as entregas das três sprints e define como cada item deve ser verificado. A rastreabilidade deve conectar requisito, tarefa do Product Backlog, implementação, responsável e evidência.

**Regras de situação:**

- **Não iniciado:** a atividade ainda não começou.
- **Em andamento:** há trabalho iniciado, mas ainda falta cumprir ou verificar pelo menos um critério.
- **Em validação:** a entrega foi produzida e aguarda revisão ou evidência final.
- **Concluído:** todos os critérios aplicáveis foram verificados e existe evidência consultável.
- **Bloqueado:** existe uma dependência ou impedimento que impede a continuidade; o motivo deve ser registrado.

Uma tarefa não deve ser marcada como **Concluída** apenas porque o código ou documento existe, porque um PR foi aberto ou porque a atividade foi planejada. É necessário conferir o critério de aceite e registrar a evidência correspondente.

As situações abaixo representam a leitura do repositório e das issues em 09/11/2026, após a Sprint Review 2. Devem continuar sendo atualizadas pela equipe após cada Planning, Daily, Review ou revisão de PR.

---

## 2. Plano por sprint

### Sprint 1 — Base do projeto e prototipação

**Objetivo:** estabelecer a base do produto e do processo de desenvolvimento, definindo o backlog, a identidade visual, os protótipos, a modelagem inicial do banco e os primeiros registros de planejamento e documentação.

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| ES01 | RP07 — gestão e priorização do produto | Product Backlog atualizado com tarefas identificadas, prioridades, disciplinas e sprint prevista | Conferir se as tarefas têm código, descrição, prioridade, disciplina e sprint; validar com o planejamento da equipe | Igor e equipe Green Stack | [`docs/sprints/product-backlog.md`](./sprints/product-backlog.md) | Concluído |
| ES03 | RP07 — planejamento das entregas | Plano de entregas para orientar o desenvolvimento das três sprints | Conferir se as três sprints possuem objetivo, entregas previstas, critérios de verificação e responsáveis; atualizar após cada Planning | Fernanda e equipe Green Stack | Este documento e [relatório da Sprint 1](./sprints/sprint-1.md) | Concluído |
| ES04 | RP07 — Definition of Done | Critérios compartilhados para considerar uma entrega pronta | Conferir se a DoD está documentada, foi apresentada à equipe e é aplicada nas revisões e PRs | Equipe Green Stack | Seção [Definition of Done](#5-definition-of-done-dod) e [template de PR](../.github/PULL_REQUEST_TEMPLATE.md) | Concluído |
| ES06 | RP07 — planejamento e inspeção da Sprint 1 | Sprint Backlog e registro da Sprint Review da Sprint 1 | Conferir atividades, responsáveis, situação, retrospectiva, burndown e registro da demonstração | Equipe Green Stack | [Relatório da Sprint 1](./sprints/sprint-1.md) | Concluído |
| ES09 | RNF05 — documentação técnica | README principal atualizado e organização inicial da documentação do projeto | Seguir as instruções em um ambiente local; abrir os links; conferir se os documentos descritos existem e correspondem ao estado do produto | Fernanda e equipe Green Stack | [`README.md`](../README.md), [`docs/README.md`](./README.md) e documentos vinculados | Concluído |

### Sprint 2 — Integração, cálculo, dashboard e organização do processo

**Objetivo:** integrar frontend, backend e banco de dados; coletar e persistir métricas; calcular energia e CO₂e; apresentar indicadores; preparar o dashboard e consolidar a documentação e o processo de desenvolvimento.

**Período das Dailies:** 21/10/2026 a 09/11/2026, com registros em 21/10, 22/10, 23/10, 26/10, 27/10, 28/10, 29/10, 30/10, 03/11, 04/11, 05/11, 06/11 e 09/11. **Sprint Review:** 09/11/2026.

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| ES02 | RP07 — plano de entregas conforme a rubrica | Plano organizado e atualizado por sprint, com a tabela exigida e DoD completa | Conferir objetivo por sprint, as sete colunas exigidas, os códigos ES01–ES09 e DW01, a DoD e a regra de conclusão mediante evidência | Fernanda | [Issue #117](https://github.com/greenstackfatec-tech/greener/issues/117) — fechada; este documento | Concluído |
| ES03 | RP07 — atualização do planejamento | Revisão do plano com base no que foi realizado, replanejado e ainda está previsto | Comparar plano, Product Backlog e Sprint Backlogs; atualizar o planejamento após o Sprint Planning da Sprint 3 e registrar o que permanecer pendente | Fernanda e equipe Green Stack | Este documento, [Product Backlog](./sprints/product-backlog.md), [relatório da Sprint 2](./sprints/sprint-2.md) e planejamento da Sprint 3 | Em andamento |
| ES05 | RP07 — rastreabilidade e fluxo de Git | Convenção de branches, commits e Pull Requests associada aos códigos das tarefas | Conferir a convenção registrada, exemplos de branch/commit/PR e aplicação nos PRs; confirmar que a equipe conhece o fluxo | Fernanda e equipe Green Stack | [Issue #116](https://github.com/greenstackfatec-tech/greener/issues/116) — fechada; [template de PR](../.github/PULL_REQUEST_TEMPLATE.md) | Concluído |
| ES07 | RP07 — Sprint Backlog e Sprint Review da Sprint 2 | Sprint Backlog da Sprint 2 e registro da Sprint Review de 09/11/2026 | Conferir tarefas, pontos, responsáveis e prazos no backlog; verificar o relatório da Review, resultados, pendências, burndown, retrospectiva e decisões | Fernanda e equipe Green Stack | [Sprint Backlog — issue #127](https://github.com/greenstackfatec-tech/greener/issues/127) — fechada; [registro da Review — issue #118](https://github.com/greenstackfatec-tech/greener/issues/118) — fechada; [relatório da Sprint 2](./sprints/sprint-2.md) | Concluído |
| ES09 | RNF05 — documentação técnica | README principal atualizado com tecnologias, funcionalidades implementadas, integrantes, execução e links | Conferir se as informações correspondem ao produto; abrir os links e validar as instruções de execução na branch de entrega | Fernanda e equipe Green Stack | [`README.md`](../README.md); [issue #119](https://github.com/greenstackfatec-tech/greener/issues/119) — fechada | Concluído |
| ES10 | RNF05 — arquitetura e modelo de dados | Documentação da arquitetura, fluxo de dados e modelo relacional | Conferir o fluxo API do cliente → backend → banco → frontend, as responsabilidades dos módulos, o diagrama ER e a correspondência com o schema | Fernanda | [`arquitetura.md`](./arquitetura.md); [issue #121](https://github.com/greenstackfatec-tech/greener/issues/121) — fechada | Concluído |
| ES11 | RNF05 — documentação dos cálculos | Fórmulas, variáveis, unidades, fatores e exemplo de cálculo de energia e CO₂e | Conferir as fórmulas, as unidades, os fatores adotados e o exemplo em relação à implementação | Igor e equipe Green Stack | [`calculos.md`](./calculos.md) e [relatório da Sprint 2](./sprints/sprint-2.md) | Concluído |
| ES12 | RNF05 — documentação dos endpoints da API | Endpoints documentados com método, rota, parâmetros, exemplos, respostas e autenticação | Comparar cada rota documentada com as rotas efetivamente implementadas no backend | Fernanda | [`api.md`](./api.md); [issue #122](https://github.com/greenstackfatec-tech/greener/issues/122) — fechada | Concluído |
| ES16 | RP07 — registros das Dailies e vídeos das Sprint Reviews | Atas das Dailies da Sprint 2 (13 registros entre 21/10 e 09/11) e registros das demonstrações de cada Sprint | Conferir uma linha por Daily com data, participantes, atividades e impedimentos; validar os links das demonstrações das Reviews | Fernanda e equipe Green Stack | [Sprint 1](./sprints/sprint-1.md); [Sprint 2](./sprints/sprint-2.md); [issue #114](https://github.com/greenstackfatec-tech/greener/issues/114) — fechada | Concluído |
| ES17 | RNF05 — READMEs do backend e do frontend | Documentação de organização, configuração, variáveis, telas, integrações e comandos de execução | Conferir as instruções com os arquivos e scripts atuais; executar os comandos documentados quando aplicável | Fernanda | [`backend/README.md`](../backend/README.md), [`frontend/README.md`](../frontend/README.md); [issue #120](https://github.com/greenstackfatec-tech/greener/issues/120) — fechada | Concluído |
| DW01 | RP01 — estrutura do frontend | Aplicação frontend em React + TypeScript, com pastas e arquivos utilizados e build servido por Nginx | Conferir estrutura em `frontend/src`; executar `npm ci` e `npm run build`; verificar Dockerfile, configuração Nginx e proxy `/api/` | Renan | [Issue #77](https://github.com/greenstackfatec-tech/greener/issues/77) — fechada; [`frontend/Dockerfile`](../frontend/Dockerfile), [`frontend/nginx.conf`](../frontend/nginx.conf), [`frontend/package.json`](../frontend/package.json) | Concluído |
| DW18 | RP01 — tela inicial responsiva | Tela de início adaptada para desktop e mobile | Conferir a implementação e comparar a interface com o protótipo aprovado | Fernanda | [Issue #115](https://github.com/greenstackfatec-tech/greener/issues/115) — fechada; [relatório da Sprint 2](./sprints/sprint-2.md) | Concluído |
| DW23 | RNF03/RNF04 — integração contínua e confiabilidade do ambiente | Verificações automatizadas de typecheck, build do Compose e smoke test, além de ajustes nos Dockerfiles | Conferir o workflow de CI e verificar os checks executados em Pull Requests | Equipe Green Stack | [Issue #123](https://github.com/greenstackfatec-tech/greener/issues/123) — fechada; [workflow de CI](../.github/workflows/ci.yml) | Concluído |

**Situação após a Sprint Review 2 (09/11/2026):** o Sprint Backlog (#127) e o registro da Review (#118) estão fechados. O burndown do relatório da Sprint 2 termina em **0 pontos restantes**. A documentação e as entregas listadas acima foram atualizadas com base nas issues encerradas e nos arquivos existentes no repositório.

**Pendência de publicação:** no relatório da Sprint 2, o link da demonstração ainda está como `#`. Substitua-o pelo endereço do vídeo publicado antes da entrega final. Por isso, a atividade ES16 permanece **Em andamento**, considerando também os registros das próximas sprints.

### Sprint 3 — Análise, autenticação, comparação e entrega final

**Objetivo:** concluir as funcionalidades de análise e comparação, autenticação e configuração previstas para a sprint; consolidar a documentação; validar a versão integrada e registrar a Sprint Review e a entrega final.

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| ES08 | RP07 — planejamento e inspeção da Sprint 3 | Sprint Backlog e registro da Sprint Review de 23/11/2026 | Antes da sprint, conferir tarefas, pontos, responsáveis e prazos; após a Review, registrar demonstração, itens concluídos e pendentes, verificações, burndown, retrospectiva e decisões | A definir no Sprint Planning; equipe Green Stack | [Product Backlog](./sprints/product-backlog.md); relatório `docs/sprints/sprint-3.md` a preencher | Não iniciado |
| ES09 | RNF05 — documentação e entrega final | Documentação final coerente com a versão entregue | Fazer clone limpo da branch de entrega; executar as instruções; conferir links, arquitetura, dados, endpoints, variáveis, testes e versões; remover instruções obsoletas | Fernanda e equipe Green Stack | [`README.md`](../README.md), documentação em [`docs/`](./README.md), READMEs de `backend/`, `frontend/` e `database/` | Planejado |

---

## 3. Critérios de aceite dos requisitos do produto

Os critérios abaixo complementam as tabelas das sprints. A tarefa só pode ser aceita quando os critérios dos requisitos envolvidos forem verificados e houver evidência adequada.

### Descoberta e monitoramento

**RF01 — Descoberta de serviços**
- [x] Consultar o endpoint `/services` do Agregador de Métricas.
- [x] Persistir ou atualizar os serviços identificados, incluindo identificador, nome e localização disponíveis.
- [x] Tratar falha do Agregador sem encerrar a aplicação.
- [ ] Testar resposta válida, lista vazia e erro da API.

**RF02 — Monitoramento dinâmico**
- [ ] Detectar serviço incluído sem reiniciar o sistema.
- [ ] Deixar de consultar serviço removido e refletir a alteração na interface.
- [ ] Identificar indisponibilidade e continuar reavaliando o serviço.
- [ ] Retomar o monitoramento quando o serviço voltar.
- [ ] Testar inclusão, remoção, queda e retorno.

### Coleta e tratamento de métricas

**RF03 — Coleta de métricas por serviço**
- [ ] Consultar periodicamente `/metrics/{id_servico}` para cada serviço monitorado.
- [ ] Documentar e permitir configurar o intervalo de coleta.
- [x] Evitar que a coleta de um serviço bloqueie a dos demais.
- [ ] Testar se o endpoint correto é chamado para cada serviço.

**RF04 — Variação das métricas**
- [x] Tratar cada coleta como uma nova observação, sem assumir valores fixos.
- [x] Refletir alterações no dashboard e no histórico.
- [x] Tratar campos ausentes, nulos ou em formato inesperado.
- [ ] Testar respostas diferentes para o mesmo serviço em coletas consecutivas.

**RF05 — Detecção de indisponibilidade**
- [x] Identificar timeout, erro de rede e status HTTP de erro como indisponibilidade.
- [x] Exibir o estado de forma visível.
- [x] Registrar o momento da detecção.
- [x] Atualizar a contagem de serviços indisponíveis.
- [ ] Testar timeout, erro 5xx e falha de conexão.

**RF06 — Ausência de métricas**
- [x] Identificar serviço listado, mas sem métricas exportadas, como ativo sem métricas.
- [x] Diferenciar esse estado de indisponibilidade na lógica e na interface.
- [x] Informar claramente que o serviço está ativo, porém sem dados.
- [ ] Testar resposta de métricas vazia ou inexistente.

### Cálculos e indicadores

**RF07 — Cálculo individual**
- [x] Calcular consumo energético estimado por serviço.
- [x] Calcular emissão estimada de CO₂e por serviço.
- [x] Documentar fórmulas, unidades e fatores adotados.
- [x] Testar valores conhecidos e casos limite, incluindo zero e dados ausentes.

**RF08 — Indicadores agregados**
- [x] Calcular consumo total, emissão total, serviços ativos e serviços indisponíveis.
- [ ] Recalcular os indicadores a cada ciclo de coleta.
- [x] Documentar como serviços indisponíveis ou sem métricas são tratados nos totais.
- [x] Testar diferentes combinações de estados.

### Dashboard e visualização

**RF09 — Dashboard operacional**
- [x] Exibir por serviço estado, localização, métricas disponíveis, consumo estimado e emissão de CO₂e.
- [ ] Dar destaque aos indicadores agregados.
- [x] Diferenciar visualmente ativo, indisponível e sem métricas.
- [ ] Validar em navegador desktop e dispositivo móvel.

**RF10 — Histórico de coletas**
- [x] Armazenar identificador do serviço, data/hora e valores de cada coleta.
- [ ] Permitir consulta por serviço e período.
- [ ] Documentar o modelo de dados.
- [x] Testar gravação e leitura do histórico.

**RF11 — Atualização contínua**
- [ ] Atualizar o dashboard periodicamente sem recarregar a página.
- [ ] Preservar filtros, ordenação e seleção durante a atualização.
- [ ] Permitir que novas atualizações ocorram após uma falha pontual.

**RF12 — Localização dos serviços**
- [x] Exibir país e região.
- [x] Exibir cidade quando disponível, sem quebrar a interface quando ausente.
- [ ] Testar serviços com e sem cidade.

**RF13 — Visualização geográfica (opcional)**
- [ ] Exibir no mapa serviços que possuam latitude e longitude.
- [ ] Não exibir no mapa serviços sem coordenadas, mantendo suas demais informações.
- [ ] Validar responsividade e legibilidade em telas pequenas.

### Análise e comparação

**RF14 — Ranking de impacto**
- [ ] Permitir ordenar serviços por consumo energético e por emissão de CO₂e.
- [ ] Exibir o período considerado.
- [ ] Permitir alternar entre ordem crescente e decrescente.
- [ ] Testar ordenação e recorte temporal.

**RF15 — Comparação entre serviços**
- [ ] Permitir selecionar dois ou mais serviços.
- [ ] Comparar métricas do mesmo período para todos os serviços.
- [ ] Exibir claramente o período usado.
- [ ] Definir e tratar o caso de serviço sem dados no período.

### Requisitos não funcionais

**RNF01 — Usabilidade e responsividade**
- [ ] Permitir que um novo usuário identifique o estado geral sem instruções adicionais.
- [ ] Adaptar o layout a desktop, tablet e celular.
- [ ] Garantir contraste, tamanho de texto e legibilidade adequados.
- [ ] Anexar capturas de tela de pelo menos dois tamanhos diferentes.

**RNF02 — Atualização em tempo real**
- [ ] Definir e documentar intervalo de coleta e intervalo de atualização da interface.
- [ ] Exibir data e hora da última atualização.
- [ ] Permitir ajuste dos intervalos por configuração.

**RNF03 — Desempenho**
- [ ] Definir e registrar uma meta mensurável de desempenho.
- [x] Realizar coleta concorrente ou otimizada para múltiplos serviços.
- [ ] Verificar o desempenho com volume representativo de serviços.
- [ ] Registrar medições de tempo de resposta.

**RNF04 — Tolerância a falhas**
- [x] Garantir que a queda de um serviço não interrompa os demais.
- [x] Tratar falhas das APIs auxiliares sem derrubar a aplicação.
- [ ] Configurar timeouts e novas tentativas com valores documentados.
- [x] Informar o usuário sobre falhas de forma compreensível.
- [ ] Manter os últimos dados válidos acessíveis, identificando quando podem estar desatualizados.
- [ ] Testar falhas de serviços e APIs auxiliares.

**RNF05 — Documentação técnica**
- [x] Documentar pré-requisitos, instalação, configuração, execução e testes.
- [x] Descrever arquitetura, responsabilidades, fluxo de dados e integrações, com diagrama.
- [x] Documentar modelo de dados, entidades, atributos, relacionamentos e histórico, com diagrama.
- [x] Documentar endpoints da equipe, incluindo método, rota, parâmetros, exemplos e erros.
- [x] Documentar URLs, autenticação, variáveis de ambiente e comportamento de falha das APIs auxiliares.
- [x] Documentar intervalos, timeouts e parâmetros operacionais.
- [x] Documentar fórmulas, unidades e fatores utilizados nos cálculos.

---

## 4. Evidências aceitas

Cada entrega deve apontar para uma ou mais evidências verificáveis, conforme seu tipo:

| Tipo de entrega | Evidência esperada |
|---|---|
| Código ou funcionalidade | Pull Request, arquivos alterados, revisão aprovada e resultado de testes/build |
| API ou integração | Requisição e resposta, teste automatizado, log sem credenciais ou documentação do endpoint |
| Interface | Rota acessível e validação dos estados visuais |
| Banco de dados | Scripts/migrações, testes de integração e evidência de persistência/leitura |
| Documentação | Link para o arquivo, links internos verificados e comandos testados quando aplicável |
| Sprint ou processo | Sprint Backlog, atas, burndown, demonstração, retrospectiva e decisões registradas |

Não incluir tokens, senhas, chaves privadas, dados pessoais ou `.env` real em evidências. Quando uma evidência ainda não existir, registrar a pendência e manter a tarefa como Em andamento ou Em validação.

---

## 5. Definition of Done (DoD)

Uma tarefa, funcionalidade ou entrega só é considerada **Concluída** quando todos os itens aplicáveis abaixo forem atendidos. Itens não aplicáveis devem ser riscados no PR ou no registro da tarefa, com justificativa objetiva.

### 5.1. Requisitos e escopo
- [x] A entrega está vinculada a um código de tarefa e aos requisitos RF/RNF/RP aplicáveis.
- [ ] O critério de aceite está claro e foi conferido antes da implementação.
- [x] O comportamento implementado corresponde ao escopo acordado, sem funcionalidades ou dados fictícios apresentados como reais.
- [ ] Limitações, decisões e itens não implementados estão registrados.

### 5.2. Código e integração
- [x] A implementação está na branch prevista pela convenção de Git da equipe.
- [x] Branch, commit e Pull Request identificam a tarefa por seu código.
- [x] O código segue a organização e os padrões adotados no projeto.
- [ ] Não foram incluídas dependências, arquivos ou mudanças fora do escopo sem justificativa.
- [ ] A alteração não sobrescreve nem remove trabalho de outro integrante sem alinhamento.
- [ ] A funcionalidade integra corretamente com os componentes e contratos existentes.

### 5.3. Qualidade e testes
- [x] A aplicação executa localmente conforme os READMEs, sem passos ocultos.
- [ ] A checagem de tipos, o lint e o build aplicáveis foram executados e passaram.
- [ ] Os testes automatizados relevantes foram executados e passaram.
- [ ] O comportamento principal e os casos de erro relevantes possuem cobertura de teste adequada.
- [ ] Os testes existentes continuam passando.
- [ ] Quando a entrega envolve interface, foram verificadas as rotas, os estados de carregamento, vazio e erro, além da responsividade.
- [ ] Quando a entrega envolve API, foram verificados método, rota, validação de entrada, respostas de sucesso e erros.
- [x] Quando a entrega envolve persistência, foram verificadas gravação, leitura e integridade dos dados.

### 5.4. Segurança e confiabilidade
- [x] Nenhuma credencial, token ou chave real foi versionada.
- [x] Configurações sensíveis são fornecidas por variáveis de ambiente; o repositório contém apenas valores de exemplo não sensíveis.
- [x] Entradas externas são validadas e erros são tratados sem expor detalhes internos ou segredos.
- [ ] Falhas de serviços externos, timeouts e indisponibilidade são tratadas conforme os requisitos aplicáveis.
- [ ] Logs e evidências não expõem senhas, tokens, chaves ou dados pessoais.

### 5.5. Revisão e documentação
- [x] O Pull Request contém resumo do que mudou, passos para testar e evidências.
- [ ] Pelo menos um integrante diferente do autor revisou a alteração.
- [ ] Comentários impeditivos da revisão foram resolvidos antes da conclusão.
- [ ] A documentação afetada foi atualizada na mesma entrega.
- [ ] Links, nomes de arquivos, comandos, versões e instruções citados foram conferidos.

### 5.6. Validação e encerramento
- [ ] Os critérios de aceite da tarefa foram verificados um a um.
- [ ] Existe evidência consultável para cada critério relevante.
- [ ] A equipe validou a entrega no ambiente apropriado, com dados reais ou simulados identificados corretamente.
- [ ] A situação só foi alterada para **Concluído** após a validação e a revisão.
- [x] Pendências remanescentes foram registradas como novas tarefas ou itens replanejados.

### 5.7. DoD específica para documentação
Além dos itens gerais, documentos devem atender aos seguintes critérios:
- [ ] O conteúdo corresponde ao estado atual do repositório, distinguindo o que está implementado do que está planejado.
- [ ] Os códigos das tarefas e os requisitos estão corretos e consistentes com o Product Backlog.
- [ ] Os responsáveis são os definidos no Sprint Backlog/board; quando não houver definição, o documento informa que o responsável está a definir.
- [ ] Situações e datas estão atualizadas e não antecipam entregas futuras.
- [ ] Links relativos e externos foram abertos e verificados.
- [ ] Exemplos de comandos, configurações e respostas foram conferidos com a implementação atual.
- [ ] Diagramas, tabelas e exemplos não contradizem o código ou outros documentos.
- [ ] A revisão do documento foi registrada no Pull Request.


## 6. Referências do projeto

- [Product Backlog](./sprints/product-backlog.md)
- [Relatório da Sprint 1](./sprints/sprint-1.md)
- [Relatório da Sprint 2](./sprints/sprint-2.md)
- [Relatório da Sprint 3](./sprints/sprint-3.md)
- [Arquitetura](./arquitetura.md)
- [Cálculos](./calculos.md)
- [Documentação da API](./api.md)
- [README principal](../README.md)
- [Template de Pull Request](../.github/PULL_REQUEST_TEMPLATE.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
