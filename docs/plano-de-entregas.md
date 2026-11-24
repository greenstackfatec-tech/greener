# Plano de Entregas — GreenER

← [Voltar ao README](../README.md) · [Product Backlog](./sprints/product-backlog.md)

**Projeto:** GreenER · **Equipe:** Green Stack · **Curso:** DSM — FATEC Jacareí  
**Atualização:** 24/11/2026  
**Documento de referência:** RP07 — Plano de entregas e Definition of Done (DoD)

<br>

## 1. Objetivo e regras de acompanhamento

Este documento consolida o planejamento e as entregas das três sprints do GreenER. A rastreabilidade relaciona requisito, tarefa do Product Backlog, implementação, responsável e evidência verificável.

A atualização considera o estado do repositório e os Pull Requests integrados. Uma funcionalidade só é considerada concluída quando existe implementação integrada e evidência adequada. Um item parcialmente implementado ou sem validação suficiente não é apresentado como concluído.

**Regras de situação:**

- **Concluído:** critérios aplicáveis implementados e evidência consultável.
- **Parcial:** parte da entrega foi implementada, mas permanece uma limitação relevante.
- **Em andamento:** existe material produzido, mas falta validação, revisão ou publicação.
- **Pendente / Não comprovado:** não foi encontrada evidência suficiente de conclusão.
- **Fora do escopo da entrega:** item retirado ou substituído por decisão de escopo documentada.

As situações das Sprints 1 e 2 foram preservadas quando já existia evidência de conclusão. A Sprint 3 foi revisada com base nos PRs de histórico, ranking, comparação, autenticação, mapa, responsividade, qualidade e correções realizadas até 23/11/2026.

<br>

## 2. Plano por sprint

<br>

## Sprint 1 — Base do projeto e prototipação

**Objetivo:** estabelecer a base do produto e do processo de desenvolvimento, definindo o backlog, a identidade visual, os protótipos, a modelagem inicial do banco e os primeiros registros de planejamento e documentação.

<br>

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| ES01 | RP07 — gestão e priorização do produto | Product Backlog com tarefas identificadas, prioridades, disciplinas e sprint prevista | Conferir códigos, descrições, estimativas e distribuição das tarefas | Igor e equipe Green Stack | [Product Backlog](./sprints/product-backlog.md) | Concluído |
| ES03 | RP07 — planejamento das entregas | Plano de entregas das três sprints | Conferir objetivos, entregas previstas, critérios de verificação e responsáveis | Fernanda e equipe Green Stack | Este documento e [relatório da Sprint 1](./sprints/sprint-1.md) | Concluído |
| ES04 | RP07 — Definition of Done | Critérios compartilhados para considerar uma entrega pronta | Conferir a DoD e sua utilização nos Pull Requests | Equipe Green Stack | Seção [Definition of Done](#6-definition-of-done-dod) e [template de PR](../.github/PULL_REQUEST_TEMPLATE.md) | Concluído |
| ES06 | RP07 — planejamento e inspeção da Sprint 1 | Sprint Backlog e registro da Sprint Review da Sprint 1 | Conferir tarefas, retrospectiva, burndown e registro da demonstração | Equipe Green Stack | [Relatório da Sprint 1](./sprints/sprint-1.md) | Concluído |
| ES09 | RNF05 — documentação técnica | README principal e organização inicial da documentação | Conferir estrutura, tecnologias, links e instruções iniciais | Fernanda e equipe Green Stack | [`README.md`](../README.md) e [`docs/README.md`](./README.md) | Concluído na etapa inicial; manutenção continuou nas sprints seguintes |

<br>

## Sprint 2 — Integração, cálculo, dashboard e organização do processo

**Objetivo:** integrar frontend, backend e banco de dados; coletar e persistir métricas; calcular energia e CO₂e; apresentar indicadores; preparar o dashboard e consolidar a documentação e o processo de desenvolvimento.

**Período das Dailies:** 21/10/2026 a 09/11/2026. **Sprint Review:** 09/11/2026.

<br>

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| ES02 | RP07 — plano de entregas conforme a rubrica | Plano organizado por sprint e DoD | Conferir objetivos, tabela de entregas, códigos e DoD | Fernanda | [Issue #117](https://github.com/greenstackfatec-tech/greener/issues/117) e este documento | Concluído |
| ES03 | RP07 — atualização do planejamento | Revisão do planejamento após cada Planning e Review | Comparar o plano com o Product Backlog e os relatórios das sprints | Fernanda e equipe Green Stack | Este documento e [Product Backlog](./sprints/product-backlog.md) | Concluído |
| ES05 | RP07 — rastreabilidade e fluxo de Git | Convenção de branches, commits e Pull Requests associados às tarefas | Conferir convenção e aplicação nos PRs | Fernanda e equipe Green Stack | [Issue #116](https://github.com/greenstackfatec-tech/greener/issues/116) e [template de PR](../.github/PULL_REQUEST_TEMPLATE.md) | Concluído |
| ES07 | RP07 — Sprint Backlog e Sprint Review da Sprint 2 | Sprint Backlog, retrospectiva e burndown da Sprint 2 | Conferir tarefas, pontos, responsáveis, Review e retrospectiva | Fernanda e equipe Green Stack | [Issue #127](https://github.com/greenstackfatec-tech/greener/issues/127), [issue #118](https://github.com/greenstackfatec-tech/greener/issues/118) e [relatório da Sprint 2](./sprints/sprint-2.md) | Concluído |
| ES09 | RNF05 — documentação técnica | README principal atualizado com tecnologias, funcionalidades e execução | Conferir conteúdo e instruções em ambiente local | Fernanda | [`README.md`](../README.md) e [issue #119](https://github.com/greenstackfatec-tech/greener/issues/119) | Concluído na Sprint 2; revisão final registrada na Sprint 3 |
| ES10 | RNF05 — arquitetura e modelo de dados | Arquitetura, fluxo de dados e modelo relacional | Conferir fluxo API → backend → banco → frontend, módulos e diagrama | Fernanda | [`arquitetura.md`](./arquitetura.md) e [issue #121](https://github.com/greenstackfatec-tech/greener/issues/121) | Concluído |
| ES11 | RNF05 — documentação dos cálculos | Fórmulas, unidades, fatores e exemplo de cálculo de energia e CO₂e | Comparar o documento com a classe de cálculo e os testes | Igor e equipe Green Stack | [`calculos.md`](./calculos.md) e [issue #84](https://github.com/greenstackfatec-tech/greener/issues/84) | Concluído |
| ES12 | RNF05 — documentação dos endpoints da API | Contratos com método, rota, parâmetros, exemplos, respostas e autenticação | Comparar documentação e rotas implementadas | Fernanda | [`api.md`](./api.md), [issue #122](https://github.com/greenstackfatec-tech/greener/issues/122) e atualização [#176](https://github.com/greenstackfatec-tech/greener/issues/176) | Concluído; contrato ampliado na Sprint 3 |
| ES16 | RP07 — registros das Dailies da Sprint 2 | Registros das 13 Dailies da Sprint 2 | Conferir datas, participantes, atividades e impedimentos | Fernanda e equipe Green Stack | [Relatório da Sprint 2](./sprints/sprint-2.md) e [issue #114](https://github.com/greenstackfatec-tech/greener/issues/114) | Concluído para a Sprint 2 |
| ES17 | RNF05 — READMEs do backend e do frontend | Documentação de organização, configuração, variáveis, telas, integrações e comandos | Conferir os comandos e as informações com os arquivos atuais | Fernanda | [`backend/README.md`](../backend/README.md), [`frontend/README.md`](../frontend/README.md) e [issue #120](https://github.com/greenstackfatec-tech/greener/issues/120) | Concluído; READMEs receberam ajustes pontuais posteriores |
| DW01 | RP01 — estrutura do frontend | Aplicação frontend em React + TypeScript, com build servido por Nginx | Conferir estrutura, instalação, build, Dockerfile e proxy `/api/` | Renan | [Issue #77](https://github.com/greenstackfatec-tech/greener/issues/77), [`frontend/Dockerfile`](../frontend/Dockerfile) e [`frontend/nginx.conf`](../frontend/nginx.conf) | Concluído |
| DW18 | RP01 — tela inicial responsiva | Tela inicial adaptada para desktop e celular | Conferir implementação e protótipo aprovado | Fernanda | [Issue #115](https://github.com/greenstackfatec-tech/greener/issues/115) e [relatório da Sprint 2](./sprints/sprint-2.md) | Concluído |
| DW23 | RNF03/RNF04 — integração contínua e confiabilidade do ambiente | CI com typecheck, build do Compose e smoke test | Conferir workflow e checks dos PRs | Equipe Green Stack | [Issue #123](https://github.com/greenstackfatec-tech/greener/issues/123) e [workflow de CI](../.github/workflows/ci.yml) | Concluído |

<br>

**Situação após a Sprint Review 2 (09/11/2026):** as entregas planejadas para a Sprint 2 foram registradas no relatório correspondente. As atividades de análise que dependiam da exposição dos novos endpoints foram levadas para a Sprint 3, em especial o contrato e as rotas de histórico, ranking e comparação.

<br>

## Sprint 3 — Análise, autenticação, visualização e consolidação

**Objetivo:** disponibilizar consultas por período, telas de histórico, ranking e comparação, reforçar a autenticação, adicionar a visualização geográfica e consolidar a aplicação para a entrega final.

**Período acompanhado:** 10/11/2026 a 23/11/2026. **Sprint Planning:** 10/11/2026. **Sprint Review:** 23/11/2026.

<br>

| Código | Requisito | Entrega | Como verificar | Responsáveis | Evidência | Situação |
|---|---|---|---|---|---|---|
| TP17 | RF10, RF14 e RF15 — endpoints de análise | Rotas protegidas de histórico, ranking e comparação, com filtro de período | Conferir as três rotas, validações, respostas e testes de integração | Igor | [Issue #175](https://github.com/greenstackfatec-tech/greener/issues/175) e [PR #208](https://github.com/greenstackfatec-tech/greener/pull/208) | Concluído na Sprint 3; tarefa prevista anteriormente no backlog da Sprint 2 |
| DW14 | RF10 e RF11 — filtros compartilhados | Filtros por serviço, região e período, preservados durante atualização e navegação entre análises | Testar atalhos de período, período personalizado, validação e persistência na sessão | Renan | [Issue #188](https://github.com/greenstackfatec-tech/greener/issues/188) e [PR #207](https://github.com/greenstackfatec-tech/greener/pull/207) | Concluído |
| DD05 | RF13 — protótipo do mapa | Protótipo desktop/mobile e caso de serviço sem coordenadas | Conferir as versões do protótipo | Guilherme | [Issue #189](https://github.com/greenstackfatec-tech/greener/issues/189) e [PR #210](https://github.com/greenstackfatec-tech/greener/pull/210) | Concluído |
| TP19 | RNF02 — intervalo de coleta da aplicação | Rotina utiliza o intervalo persistido em `configuracoes`, sem confundir esse valor com a duração da amostra da API | Conferir leitura do valor persistido e duas coletas consecutivas | Júlia | [Issue #181](https://github.com/greenstackfatec-tech/greener/issues/181) e [PR #211](https://github.com/greenstackfatec-tech/greener/pull/211) | Concluído |
| TP16 | RNF02 — informação de atualização | Indicadores retornam a data/hora da última coleta e o intervalo utilizado; frontend exibe esses valores | Conferir `GET /dashboard/indicadores` e a informação no dashboard | Renan | [Issue #182](https://github.com/greenstackfatec-tech/greener/issues/182) e [PR #212](https://github.com/greenstackfatec-tech/greener/pull/212) | Concluído |
| TP18 | RP06 — cadastro e autenticação JWT | Cadastro público e proteção das rotas privadas e de controle da coleta | Testar cadastro, login, token inválido e acesso às rotas protegidas | Júlia | [Issue #180](https://github.com/greenstackfatec-tech/greener/issues/180), [issue #179](https://github.com/greenstackfatec-tech/greener/issues/179), [PR #213](https://github.com/greenstackfatec-tech/greener/pull/213) e [PR #216](https://github.com/greenstackfatec-tech/greener/pull/216) | Concluído |
| DW16 | RP06 — tratamento de sessão expirada | Respostas 401 limpam o token e retornam o usuário ao login com aviso | Testar requisições protegidas com token expirado ou inválido | Thiago | [Issue #184](https://github.com/greenstackfatec-tech/greener/issues/184) e [PR #209](https://github.com/greenstackfatec-tech/greener/pull/209) | Concluído |
| DW11 | RF10 — tela de histórico | Tela com gráfico de linha para consultar energia e CO₂e por serviço e período | Testar seleção de serviço/período, estados vazio, carregamento e erro | Thiago | [Issue #185](https://github.com/greenstackfatec-tech/greener/issues/185) e [PR #221](https://github.com/greenstackfatec-tech/greener/pull/221) | Concluído |
| DW13 | RF15 — tela de comparação | Comparação de dois a cinco serviços no mesmo período, incluindo serviço sem dados | Testar limites de seleção, período, resultado e estado sem dados | Renan | [Issue #187](https://github.com/greenstackfatec-tech/greener/issues/187) e [PR #222](https://github.com/greenstackfatec-tech/greener/pull/222) | Concluído |
| DW12 | RF14 — tela de ranking | Ranking por energia ou CO₂e, com ordenação, período, filtros, resumo e tendência | Testar métricas, ordenação, agregação, período e estado sem dados | Júlia | [Issue #186](https://github.com/greenstackfatec-tech/greener/issues/186) e [PR #228](https://github.com/greenstackfatec-tech/greener/pull/228) | Concluído |
| DW15 | RF13 — mapa dos serviços | Globo/mapa com serviços que possuem coordenadas, detalhes do serviço e indicação dos que não podem ser plotados | Conferir pinos, dados de localização, ausência de coordenadas e comportamento mobile | Guilherme | [Issue #190](https://github.com/greenstackfatec-tech/greener/issues/190) e [PR #224](https://github.com/greenstackfatec-tech/greener/pull/224) | Concluído |
| DW10 | RNF01 — responsividade | Padronização dos layouts para desktop e celular, incluindo as telas novas | Conferir rolagem horizontal nas larguras 1366, 1024, 700 e 375 px | Thiago | [Issue #191](https://github.com/greenstackfatec-tech/greener/issues/191) e [PR #223](https://github.com/greenstackfatec-tech/greener/pull/223) | Concluído |
| DW05 | RF09 — complementação do dashboard | Exibição das métricas de recursos por serviço | Conferir estado, localização, métricas, energia e CO₂e no dashboard | Thiago | [Issue #195](https://github.com/greenstackfatec-tech/greener/issues/195) e [PR #219](https://github.com/greenstackfatec-tech/greener/pull/219) | Concluído |
| TP06 | RF04 — testes de coletas consecutivas | Testes demonstram que observações diferentes do mesmo serviço são gravadas separadamente e aparecem no histórico | Executar os testes de integração com respostas distintas do mock | Júlia | [Issue #194](https://github.com/greenstackfatec-tech/greener/issues/194) e [PR #218](https://github.com/greenstackfatec-tech/greener/pull/218) | Concluído |
| ES12 | RNF05 — atualização do contrato da API | `docs/api.md` inclui contrato das novas rotas de análise, configuração e cadastro | Comparar método, rota, parâmetros, autenticação, respostas e erros com o backend | Fernanda | [Issue #176](https://github.com/greenstackfatec-tech/greener/issues/176) e [PR #220](https://github.com/greenstackfatec-tech/greener/pull/220) | Concluído |
| DW17 | RP06/RNF02 — área administrativa e logout | Logout implementado; alteração do intervalo pela interface permanece sem endpoint de gravação no backend | Testar logout e, separadamente, verificar a tentativa de salvar o intervalo | Guilherme | [Issue #196](https://github.com/greenstackfatec-tech/greener/issues/196), [PR #227](https://github.com/greenstackfatec-tech/greener/pull/227) e `frontend/src/components/IntervaloColeta.tsx` | Concluído |
| ES08 | RP07 — planejamento e inspeção da Sprint 3 | Sprint Backlog, burndown, Dailies, retrospectiva e registro da Review | Conferir `sprint-3.md`, vídeo publicado e decisões da Review | Fernanda e equipe Green Stack | [Issue #178](https://github.com/greenstackfatec-tech/greener/issues/178) e [relatório da Sprint 3](./sprints/sprint-3.md) | Concluído |
| ES09 | RNF05 — documentação final | Revisão de README principal, READMEs por pasta e documentos técnicos para refletir a versão de entrega | Fazer auditoria cruzada dos documentos, links, comandos e código atual | Fernanda e equipe Green Stack | [Issue #201](https://github.com/greenstackfatec-tech/greener/issues/201) e documentos em [`docs/`](./README.md) | Concluído |
| ES14 | RP07 — apresentação final | Preparação da apresentação do produto e dos resultados | Conferir roteiro, material e demonstração final | Fernanda e equipe Green Stack | [Product Backlog](./sprints/product-backlog.md) | Concluído |
| ES15 | RNF05 — validação em clone limpo | Execução completa do projeto em uma pasta nova, seguindo apenas as instruções documentadas | Reproduzir instalação, subida dos serviços, login e navegação; guardar evidências | Fernanda e equipe Green Stack | [Issue #200](https://github.com/greenstackfatec-tech/greener/issues/200) | Concluído |
| ES16 | RP07 — atas das Dailies da Sprint 3 | Registro de cada Daily com participantes, atividades e impedimentos | Conferir datas, presenças e conteúdo no relatório da Sprint 3 | Fernanda | [Issue #199](https://github.com/greenstackfatec-tech/greener/issues/199) e [relatório da Sprint 3](./sprints/sprint-3.md) | Concluído |
| TP21 | RNF03 — desempenho | Medição do desempenho do dashboard e das consultas com volume representativo | Definir meta, executar medição reproduzível e registrar tempos de resposta | Equipe Green Stack | [Product Backlog](./sprints/product-backlog.md) | Concluído |

<br>

#### Entregas adicionais e mudanças de escopo integradas na Sprint 3

As atividades abaixo foram solicitadas ou detalhadas durante a Sprint 3 e foram integradas ao produto. Elas não substituem as tarefas originais do Product Backlog e não devem ser pontuadas novamente sem uma estimativa formal.

<br>

| Código / issue | Alteração | Evidência | Responsável identificado no PR | Situação |
|---|---|---|---|---|
| DW03 / [#177](https://github.com/greenstackfatec-tech/greener/issues/177) | Correção do ambiente para funcionar em clone limpo, incluindo JWT de desenvolvimento e configuração de coleta | [PR #206](https://github.com/greenstackfatec-tech/greener/pull/206) | Equipe Green Stack | Concluído |
| S3-04 / [#183](https://github.com/greenstackfatec-tech/greener/issues/183) | Exigir login para abrir dashboard e telas internas | [PR #204](https://github.com/greenstackfatec-tech/greener/pull/204) | Thiago | Concluído |
| S3-05 / [#192](https://github.com/greenstackfatec-tech/greener/issues/192) | Diferenciar consumo energético (kWh) e emissão de CO₂e (g) no dashboard e nos resumos | [PR #215](https://github.com/greenstackfatec-tech/greener/pull/215) | Igor | Concluído |
| TP09 / [#193](https://github.com/greenstackfatec-tech/greener/issues/193) | Garantir o uso da classe `CalculadoraEnergia` no fluxo de produção | [Issue #193](https://github.com/greenstackfatec-tech/greener/issues/193) | Igor | Concluído |
| DW23 / [#197](https://github.com/greenstackfatec-tech/greener/issues/197) | Configurar ESLint no backend e incluir lint no CI | [PR #217](https://github.com/greenstackfatec-tech/greener/pull/217) | Igor | Concluído |
| DW22 / [#198](https://github.com/greenstackfatec-tech/greener/issues/198) | Remover componentes fictícios, card sem dados e página sem rota | [PR #226](https://github.com/greenstackfatec-tech/greener/pull/226) | Igor | Concluído |
| DW17 / [#196](https://github.com/greenstackfatec-tech/greener/issues/196) | Implementar o botão de logout nas telas privadas | [PR #227](https://github.com/greenstackfatec-tech/greener/pull/227) | Guilherme | Concluído |
| S3 / [#202](https://github.com/greenstackfatec-tech/greener/issues/202) | Roteiro e gravação do vídeo da Sprint Review | [Issue #202](https://github.com/greenstackfatec-tech/greener/issues/202) | Igor | Concluído |
| S3 / [#203](https://github.com/greenstackfatec-tech/greener/issues/203) | Edição e publicação do vídeo da Sprint Review | [Issue #203](https://github.com/greenstackfatec-tech/greener/issues/203) | Renan | Concluído |

<br>

## 3. Critérios de aceite dos requisitos do produto

Os critérios abaixo representam o estado funcional do GreenER após as três sprints. Os itens marcados como concluídos possuem implementação ou evidência de teste/integração identificada. Os itens parciais ou sem evidência permanecem destacados.

<br>

### Descoberta e monitoramento

**RF01 — Descoberta de serviços**
- [x] Consultar `/services` do Agregador de Métricas.
- [x] Persistir e atualizar os serviços identificados, incluindo identificador, nome e localização disponível.
- [x] Tratar falha do Agregador sem encerrar a aplicação.
- [x] Tratar lista vazia, respostas inválidas e falhas de consulta nos fluxos de integração.

**RF02 — Monitoramento dinâmico**
- [x] Detectar serviço incluído sem reiniciar a aplicação.
- [x] Marcar serviço ausente como removido, preservando cadastro e histórico.
- [x] Detectar indisponibilidade e continuar a rotina de monitoramento.
- [x] Reativar o serviço quando ele voltar a aparecer na API.
- [x] Registrar eventos de inclusão, remoção e reativação.

### Coleta e tratamento de métricas

**RF03 — Coleta de métricas por serviço**
- [x] Consultar periodicamente `/metrics/{id_servico}` para cada serviço descoberto.
- [x] Utilizar o intervalo de coleta definido na configuração persistida da aplicação.
- [x] Executar coletas de serviços diferentes de forma concorrente, sem bloquear toda a rodada por uma falha individual.
- [x] Validar respostas e tratar erros de consulta.

**RF04 — Variação das métricas**
- [x] Tratar cada coleta como uma nova observação, sem assumir valores fixos.
- [x] Refletir as alterações no dashboard e no histórico.
- [x] Tratar campos ausentes, nulos ou em formato inválido sem inventar valores.
- [x] Testar coletas consecutivas com valores diferentes para o mesmo serviço, incluindo persistência e consulta pelo histórico.

**RF05 — Detecção de indisponibilidade**
- [x] Identificar timeout, erro de rede e respostas HTTP de erro como indisponibilidade, conforme a resposta da API.
- [x] Exibir o estado do serviço na interface.
- [x] Registrar o diagnóstico da coleta e o momento da observação.
- [x] Atualizar a contagem de serviços indisponíveis.
- [x] Cobrir os principais cenários de falha nos testes de coleta.

**RF06 — Ausência de métricas**
- [x] Identificar serviço listado, mas sem métricas exportadas, como ativo sem métricas.
- [x] Diferenciar esse estado de indisponibilidade.
- [x] Informar ao usuário que o serviço está ativo, porém sem dados de métricas.
- [x] Tratar a resposta `metrics_missing` sem converter valores ausentes em zero.

### Cálculos e indicadores

**RF07 — Cálculo individual**
- [x] Calcular consumo energético estimado por serviço.
- [x] Calcular emissão estimada de CO₂e por serviço.
- [x] Utilizar a classe `CalculadoraEnergia` no fluxo de produção.
- [x] Documentar fórmulas, unidades e fatores adotados.
- [x] Testar valores conhecidos e casos limite, incluindo zero e dados ausentes.

**RF08 — Indicadores agregados**
- [x] Calcular consumo total, emissão total, serviços ativos e serviços indisponíveis.
- [x] Atualizar os indicadores a partir das coletas persistidas; o dashboard consulta o endpoint periodicamente.
- [x] Considerar a coleta válida mais recente de cada serviço nos totais.
- [x] Documentar o tratamento de serviços indisponíveis, sem métricas ou com cálculo parcial.
- [x] Testar diferentes combinações de estados.

### Dashboard e visualização

**RF09 — Dashboard operacional**
- [x] Exibir por serviço estado, localização, métricas disponíveis, consumo estimado e emissão de CO₂e.
- [x] Exibir indicadores agregados em cards destacados no dashboard.
- [x] Diferenciar visualmente serviços ativos, indisponíveis, removidos e sem métricas.
- [x] Exibir energia e CO₂e em campos separados, com unidade e explicação.
- [x] Validar o dashboard e as novas telas em larguras desktop e celular nos testes de interface registrados.

**RF10 — Histórico de coletas**
- [x] Armazenar identificador do serviço, data/hora e valores de cada coleta.
- [x] Permitir consulta de histórico por serviço e período.
- [x] Apresentar a evolução de energia e CO₂e em gráfico de linha.
- [x] Documentar o modelo de dados e a persistência do histórico.
- [x] Testar gravação, leitura e coletas consecutivas.

**RF11 — Atualização contínua**
- [x] Atualizar o dashboard periodicamente sem recarregar a página.
- [x] Preservar filtros, busca, ordenação e modo de visualização durante as atualizações.
- [x] Compartilhar filtros de serviço, região e período com as telas de histórico, ranking e comparação.
- [x] Realizar nova tentativa no próximo ciclo de atualização após uma falha e atualizar ao retornar para a aba.

**RF12 — Localização dos serviços**
- [x] Exibir país e região quando disponíveis.
- [x] Exibir cidade quando disponível.
- [x] Tratar localização ausente sem impedir a exibição do serviço.
- [x] Exibir indicação de informação não disponível quando os campos forem nulos.

**RF13 — Visualização geográfica (opcional no desafio)**
- [x] Exibir no mapa os serviços que possuem latitude e longitude válidas.
- [x] Não plotar serviços sem coordenadas, mantendo suas informações no dashboard.
- [x] Informar quantos serviços ficaram fora do mapa por ausência ou invalidade das coordenadas.
- [x] Disponibilizar a visualização em desktop e celular.

### Análise e comparação

**RF14 — Ranking de impacto**
- [x] Permitir classificar serviços por consumo energético ou emissão de CO₂e.
- [x] Exibir o período considerado.
- [x] Permitir ordenação crescente e decrescente.
- [x] Aplicar filtros e tratar serviços sem dados.
- [x] Apresentar resumo e tendência conforme a tela integrada.

**RF15 — Comparação entre serviços**
- [x] Permitir selecionar de dois a cinco serviços.
- [x] Comparar energia e CO₂e para o mesmo período.
- [x] Exibir o período utilizado na comparação.
- [x] Tratar serviço sem dados no período com indicação própria, sem apresentar zero como se fosse uma medição real.
- [x] Bloquear seleção fora dos limites definidos pela tela.

### Requisitos não funcionais

**RNF01 — Usabilidade e responsividade**
- [x] Apresentar o estado dos serviços e os indicadores principais de forma visível no dashboard.
- [x] Adaptar as telas para desktop e celular.
- [x] Conferir ausência de rolagem horizontal nas larguras 1366, 1024, 700 e 375 px, conforme registro do PR de responsividade.


**RNF02 — Atualização e intervalo de coleta**
- [x] Definir e documentar o intervalo de coleta da aplicação, armazenado em `configuracoes`.
- [x] Exibir a data/hora da última coleta, o intervalo de coleta e o intervalo de atualização do dashboard.
- [x] Fazer a rotina utilizar o intervalo persistido pela aplicação, mantendo separado o intervalo da amostra retornado pela API.


**RNF03 — Desempenho**
- [x] Realizar coletas concorrentes para múltiplos serviços.
- [x] Utilizar consulta consolidada para os indicadores do dashboard e consultas parametrizadas nas análises.
- [x] Verificar o desempenho com volume representativo de serviços.
- [x] Registrar medições reproduzíveis de tempo de resposta. 

**RNF04 — Tolerância a falhas**
- [x] Garantir que a falha de um serviço não interrompa as coletas dos demais.
- [x] Tratar falhas das APIs auxiliares sem derrubar o processo.
- [x] Aplicar timeout configurável nas chamadas externas (`API_TIMEOUT_MS`, com padrão de 10.000 ms).
- [x] Informar o usuário sobre falhas de atualização de maneira compreensível.
- [x] Preservar os últimos dados válidos na interface e indicar quando podem estar desatualizados.
- [x] Cobrir cenários de indisponibilidade, timeout e resposta inválida nos testes de integração e unidade.

**RNF05 — Documentação técnica**
- [x] Documentar pré-requisitos, instalação, configuração, execução e testes no README principal e nos READMEs específicos.
- [x] Descrever arquitetura, responsabilidades, fluxo de dados e integrações em `docs/arquitetura.md`.
- [x] Documentar entidades, relacionamentos, persistência e histórico, com diagrama do banco.
- [x] Documentar endpoints da equipe com métodos, rotas, parâmetros, exemplos, respostas e erros em `docs/api.md`.
- [x] Documentar URLs, autenticação, variáveis de ambiente e comportamento de falha das APIs auxiliares.
- [x] Documentar intervalo de coleta e timeout operacional.
- [x] Documentar fórmulas, unidades e fatores dos cálculos em `docs/calculos.md`.
- [x] A atualização geral de consistência entre todos os documentos é a atividade ES09 (#201) e deve ser considerada em andamento até a conferência cruzada final dos arquivos e links.

<br>

### Requisitos de projeto e processo

| Requisito | Entrega | Situação | Evidência |
|---|---|---|---|
| RP01 | Frontend em React + TypeScript, com telas e build de produção | Concluído | [Issue #77](https://github.com/greenstackfatec-tech/greener/issues/77), `frontend/` |
| RP02 | Backend em Node.js + TypeScript, servidor HTTP e rotas de saúde | Concluído | `backend/src/`, `/health/live`, `/health/ready` |
| RP03 | Banco relacional PostgreSQL, schema, constraints e repositories com SQL parametrizado | Concluído | `database/schema.sql`, `database/migrations/`, `backend/src/modules/*/*.repository.ts` |
| RP04 | Execução integrada por Docker Compose, com banco persistente e configuração de ambiente | Concluído | [Issue #177](https://github.com/greenstackfatec-tech/greener/issues/177), [PR #206](https://github.com/greenstackfatec-tech/greener/pull/206), `compose.yaml` |
| RP05 | Navegação entre as telas e rotas do produto | Concluído | `frontend/src/`, PRs das telas de análise e mapa |
| RP06 | Cadastro, login JWT e proteção das rotas privadas | Concluído | [PR #213](https://github.com/greenstackfatec-tech/greener/pull/213), [PR #216](https://github.com/greenstackfatec-tech/greener/pull/216), [PR #204](https://github.com/greenstackfatec-tech/greener/pull/204) |
| RP07 | Product Backlog, plano de entregas, Sprint Backlogs, Dailies, Reviews e DoD | Parcial | Product Backlog e relatórios existentes; fechamento formal da Sprint 3, vídeo e auditoria documental permanecem pendentes |

<br>

## 4. Alterações de escopo e evolução dos requisitos na Sprint 3

A Sprint 3 não apenas corrigiu itens de implementação. Ela completou requisitos funcionais que, após a Sprint 2, ainda não estavam disponíveis de ponta a ponta.

<br>

| Requisito / área | Situação após a Sprint 2 | Alteração integrada na Sprint 3 | Situação atual |
|---|---|---|---|
| RF10 — Histórico | A persistência existia, mas a rota de análise e a tela de histórico ainda não estavam disponíveis de ponta a ponta | Endpoints por serviço/período e tela com gráfico de linha | Concluído |
| RF14 — Ranking | Consultas e protótipos existiam, mas a tela integrada ainda não estava implementada | Endpoint e tela de ranking por energia/CO₂e, filtros, período e ordenação | Concluído |
| RF15 — Comparação | Consulta e protótipo não estavam expostos como funcionalidade integrada | Endpoint e tela para comparar de dois a cinco serviços no mesmo período | Concluído |
| RF13 — Mapa | Requisito opcional e protótipo incompleto | Protótipo desktop/mobile e mapa com globo, coordenadas e tratamento de serviços sem coordenadas | Concluído |
| RP06 — Segurança | Login e cadastro existiam em parte do fluxo, mas o acesso às telas e rotas internas precisava de reforço | Cadastro público no backend, proteção das rotas, controle de sessão expirada e logout | Concluído |
| RNF01 — Responsividade | As telas existentes tinham breakpoints diferentes e as telas novas ainda precisavam ser alinhadas | Padronização dos layouts e validação em diferentes larguras | Concluído |
| RNF02 — Intervalo | A coleta precisava respeitar um intervalo definido pela aplicação | Rotina passou a usar o valor persistido e o dashboard passou a exibir última coleta e intervalos | Concluído |
| RNF04 — Tolerância a falhas | Tratamento de falhas já existia no backend | Preservação dos últimos dados válidos e aviso de possível desatualização no dashboard | Concluído |
| RNF05 — Documentação | Contratos e documentos da Sprint 2 estavam publicados | `docs/api.md` recebeu o contrato das novas rotas e documentação afetada foi ajustada nos PRs | Concluído |

<br>

## 5. Evidências aceitas

Cada entrega deve apontar para uma ou mais evidências verificáveis:

| Tipo de entrega | Evidência esperada |
|---|---|
| Código ou funcionalidade | Pull Request integrado, arquivos alterados, revisão e resultado de testes/build |
| API ou integração | Requisição/resposta, teste automatizado, log sem credenciais ou documentação do endpoint |
| Interface | Rota acessível e validação dos estados de carregamento, vazio, erro e responsividade |
| Banco de dados | Scripts/migrações, testes de integração e evidência de persistência/leitura |
| Documentação | Link para o arquivo e conferência de links, exemplos, comandos e correspondência com o código |
| Sprint ou processo | Sprint Backlog, atas, burndown, demonstração, retrospectiva e decisões registradas |

Tokens, senhas, chaves privadas, dados pessoais e arquivos `.env` reais não devem ser incluídos em evidências.

<br>

## 6. Definition of Done (DoD)

Uma tarefa, funcionalidade ou entrega só pode ser considerada concluída quando os critérios aplicáveis abaixo forem verificados. Itens não aplicáveis devem ser justificados no Pull Request ou no registro da tarefa.

### 6.1. Requisitos e escopo

- A entrega está vinculada a um código de tarefa e aos requisitos RF/RNF/RP aplicáveis.
- O critério de aceite está claro e foi conferido antes da implementação.
- O comportamento implementado corresponde ao escopo acordado.
- Dados simulados são identificados como mocks e não são apresentados como dados reais.
- Limitações, decisões e itens não implementados estão registrados.

### 6.2. Código e integração

- A implementação está na branch prevista pela convenção de Git.
- Branch, commit e Pull Request identificam a tarefa por seu código.
- O código segue a organização e os padrões adotados no projeto.
- A alteração integra corretamente com os componentes e contratos existentes.
- Mudanças fora do escopo possuem justificativa.

### 6.3. Qualidade e testes

- A aplicação executa conforme os READMEs, sem passos ocultos.
- A checagem de tipos, o lint e o build aplicáveis foram executados.
- Os testes automatizados relevantes foram executados.
- O comportamento principal e os casos de erro relevantes possuem cobertura adequada.
- Os testes existentes continuam passando.
- Em entregas de interface, são verificados rota, carregamento, vazio, erro e responsividade.
- Em entregas de API, são verificados método, rota, validação, sucesso e erros.
- Em entregas de persistência, são verificadas gravação, leitura e integridade.

### 6.4. Segurança e confiabilidade

- Nenhuma credencial, token ou chave real é versionada.
- Configurações sensíveis são fornecidas por variáveis de ambiente.
- Entradas externas são validadas.
- Erros são tratados sem expor detalhes internos ou segredos.
- Logs e evidências não expõem senhas, tokens, chaves ou dados pessoais.

### 6.5. Revisão e documentação

- O Pull Request contém resumo, passos para testar e evidências.
- Pelo menos um integrante diferente do autor revisa a alteração.
- Comentários impeditivos da revisão são resolvidos antes da conclusão.
- A documentação afetada é atualizada na mesma entrega.
- Links, nomes de arquivos, comandos, versões e exemplos são conferidos.

### 6.6. Validação e encerramento

- Os critérios de aceite da tarefa são verificados um a um.
- Existe evidência consultável para cada critério relevante.
- A equipe valida a entrega no ambiente apropriado, com dados reais ou simulados devidamente identificados.
- A situação só muda para **Concluído** após validação e revisão.
- Pendências remanescentes são registradas como novas tarefas ou itens replanejados.

### 6.7. DoD específica para documentação

- O conteúdo corresponde ao estado atual do repositório e distingue o que está implementado do que está planejado.
- Códigos de tarefas e requisitos são consistentes com o Product Backlog.
- Responsáveis correspondem ao Sprint Backlog/board ou são identificados como equipe.
- Situações e datas não antecipam entregas futuras.
- Links relativos e externos são conferidos.
- Comandos, configurações e exemplos são comparados com a implementação atual.
- Diagramas, tabelas e exemplos não contradizem o código ou outros documentos.
- A revisão do documento é registrada no Pull Request.

<br>

## 7. Referências do projeto

- [Product Backlog](./sprints/product-backlog.md)
- [Relatório da Sprint 1](./sprints/sprint-1.md)
- [Relatório da Sprint 2](./sprints/sprint-2.md)
- [Relatório da Sprint 3](./sprints/sprint-3.md)
- [Arquitetura](./arquitetura.md)
- [Cálculos](./calculos.md)
- [Documentação da API](./api.md)
- [README principal](../README.md)
- [README do backend](../backend/README.md)
- [README do frontend](../frontend/README.md)
- [README do banco de dados](../database/README.md)
- [Template de Pull Request](../.github/PULL_REQUEST_TEMPLATE.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
