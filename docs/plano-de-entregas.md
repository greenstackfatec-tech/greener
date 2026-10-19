# Plano de Entregas

Este documento define o **Plano de Entregas** do projeto, isto é, os critérios que precisam ser atendidos para que uma funcionalidade, uma tarefa ou a entrega final seja considerada **concluída**. Ele é derivado diretamente dos Requisitos Funcionais (RF) e Não Funcionais (RNF) do sistema de monitoramento de consumo energético e emissão de CO₂e dos serviços.

> **Regra geral:** nenhum item é considerado entregue se algum dos critérios aplicáveis abaixo não estiver cumprido e evidenciado.

---

## Como usar este Plano de Entregas

- Antes de abrir um Pull Request (ou marcar uma tarefa como concluída), percorra os **critérios gerais** e os critérios do(s) requisito(s) envolvido(s).
- Cada critério deve ter uma **evidência** (teste automatizado, captura de tela, log, link para código ou documentação).
- Itens não aplicáveis devem ser justificados no PR.

---

## Critérios gerais (valem para toda entrega)

- [ ] O código foi revisado por ao menos um outro integrante da equipe.
- [ ] O código está versionado no repositório, na branch correta, com mensagens de commit claras.
- [ ] A funcionalidade roda localmente seguindo as instruções do README de execução, sem passos ocultos.
- [ ] Existem testes (unitários e/ou de integração) cobrindo o comportamento principal e os casos de erro relevantes.
- [ ] Todos os testes existentes continuam passando.
- [ ] Não há credenciais, tokens ou chaves de API versionados; a configuração é feita por variáveis de ambiente ou arquivo de exemplo (`.env.example`).
- [ ] Erros de APIs externas são tratados e registrados em log, sem derrubar a aplicação.
- [ ] A documentação afetada foi atualizada na mesma entrega.
- [ ] A funcionalidade foi demonstrada ou validada com dados reais (ou simulados) do Agregador de Métricas.

---

## Critérios por Requisito Funcional

### Descoberta e monitoramento de serviços

#### RF01 — Descoberta de serviços
- [ ] O sistema consulta o Agregador de Métricas (`/services`) para obter a lista de serviços disponíveis.
- [ ] A lista obtida é persistida/atualizada internamente com os dados de cada serviço (identificador, nome, localização, etc.).
- [ ] Falha na consulta ao Agregador não encerra a aplicação (ver RNF04).
- [ ] Teste automatizado cobre resposta válida, lista vazia e erro da API.

#### RF02 — Monitoramento dinâmico
- [ ] Um serviço **incluído** durante a execução passa a ser monitorado sem reiniciar o sistema.
- [ ] Um serviço **removido** deixa de ser consultado e é refletido na interface.
- [ ] Um serviço que ficou **indisponível** é marcado como tal e continua sendo reavaliado.
- [ ] Um serviço que **retornou** volta ao estado ativo e a coleta é retomada.
- [ ] A interface reflete todas essas mudanças sem intervenção do usuário.
- [ ] Teste automatizado simula inclusão, remoção, queda e retorno de serviços.

### Coleta e tratamento de métricas

#### RF03 — Coleta de métricas por serviço
- [ ] Para cada serviço disponível, o sistema consulta periodicamente `/metrics/{id_servico}`.
- [ ] O intervalo de coleta é configurável e documentado.
- [ ] A coleta de um serviço não bloqueia nem atrasa a coleta dos demais.
- [ ] Teste automatizado valida que o endpoint correto é chamado para cada serviço.

#### RF04 — Tratamento da variação das métricas
- [ ] O sistema não assume valores fixos: cada coleta é tratada como um novo dado.
- [ ] Os valores variam corretamente no dashboard e no histórico a cada atualização.
- [ ] Campos ausentes, nulos ou em formato inesperado são tratados sem causar falha.
- [ ] Teste automatizado usa respostas diferentes para o mesmo serviço em requisições consecutivas.

#### RF05 — Detecção de indisponibilidade
- [ ] Um serviço que não responde (timeout, erro de rede, status HTTP de erro) é identificado como **indisponível**.
- [ ] O estado "indisponível" é sinalizado de forma visível na interface.
- [ ] O momento da detecção é registrado.
- [ ] A contagem de serviços indisponíveis é atualizada (ver RF08).
- [ ] Teste automatizado cobre timeout, erro 5xx e falha de conexão.

#### RF06 — Detecção de ausência de métricas
- [ ] Um serviço listado em `/services`, mas sem métricas exportadas, é identificado como **ativo sem métricas**.
- [ ] Esse estado é distinto de "indisponível" na lógica e na interface.
- [ ] A interface informa claramente que o serviço está ativo, porém sem dados.
- [ ] Teste automatizado cobre serviço listado com resposta de métricas vazia ou inexistente.

### Cálculos e indicadores

#### RF07 — Cálculo individual
- [ ] O consumo energético estimado é calculado para cada serviço monitorado.
- [ ] A emissão de CO₂e estimada é calculada para cada serviço monitorado.
- [ ] A fórmula, as unidades e os fatores utilizados estão documentados.
- [ ] Testes unitários validam os cálculos com valores conhecidos e casos limite (zero, valores ausentes).

#### RF08 — Indicadores agregados
- [ ] O sistema calcula **consumo total**, **emissão total**, **serviços ativos** e **serviços indisponíveis**.
- [ ] Os indicadores são recalculados a cada ciclo de coleta.
- [ ] Serviços sem métricas ou indisponíveis não distorcem os totais (a regra adotada está documentada).
- [ ] Testes unitários validam os totais para diferentes combinações de estados.

### Dashboard e visualização

#### RF09 — Dashboard operacional
- [ ] Para cada serviço, o dashboard exibe: estado de monitoramento, localização, métricas disponíveis, consumo estimado e emissão estimada de CO₂e.
- [ ] Os indicadores agregados (RF08) são exibidos em destaque.
- [ ] Os estados (ativo, indisponível, sem métricas) são visualmente distinguíveis.
- [ ] Validação visual feita em ao menos um navegador desktop e um dispositivo móvel (ver RNF01).

#### RF10 — Histórico de coletas
- [ ] Cada coleta realizada é armazenada com identificador do serviço, data/hora e valores coletados.
- [ ] O histórico permite consulta por serviço e por período.
- [ ] O modelo de dados do histórico está documentado (ver RNF05).
- [ ] Teste automatizado valida gravação e leitura do histórico.

#### RF11 — Atualização contínua
- [ ] O dashboard atualiza seus dados periodicamente sem recarregar a página (polling, WebSocket, SSE ou equivalente).
- [ ] A atualização não causa perda de contexto do usuário (filtros, ordenação e seleção são mantidos).
- [ ] Falha em uma atualização não interrompe as seguintes.

#### RF12 — Localização dos serviços
- [ ] A interface exibe **país** e **região** de cada serviço.
- [ ] A **cidade** é exibida quando disponível; sua ausência não gera erro nem campo quebrado.
- [ ] Teste cobre serviços com e sem cidade.

#### RF13 — Visualização geográfica *(opcional)*
- [ ] Serviços com latitude e longitude são exibidos em mapa na posição aproximada.
- [ ] Serviços **sem** coordenadas não aparecem no mapa, mas todas as demais informações continuam visíveis.
- [ ] O mapa é responsivo e legível em telas pequenas.

### Análise e comparação

#### RF14 — Ranking de impacto
- [ ] É possível ordenar os serviços por consumo energético estimado.
- [ ] É possível ordenar os serviços por emissão estimada de CO₂e.
- [ ] O **período considerado** na comparação é exibido na interface.
- [ ] O usuário consegue alternar entre ordem crescente e decrescente.
- [ ] Teste automatizado valida a ordenação e o recorte por período.

#### RF15 — Comparação entre serviços
- [ ] O usuário consegue selecionar dois ou mais serviços para comparar.
- [ ] A comparação utiliza métricas e indicadores referentes ao **mesmo período** para todos os serviços.
- [ ] A interface deixa claro o período usado.
- [ ] O comportamento é definido e tratado quando um dos serviços não possui dados no período.

---

## Critérios por Requisito Não Funcional

#### RNF01 — Usabilidade e responsividade
- [ ] A interface é simples e clara: um novo usuário identifica o estado geral do ambiente sem instruções.
- [ ] O layout se adapta a telas de desktop, tablet e celular.
- [ ] Textos, cores e ícones têm contraste e legibilidade adequados.
- [ ] Evidência: capturas de tela em pelo menos dois tamanhos de tela diferentes.

#### RNF02 — Atualização em tempo real
- [ ] Os intervalos de coleta e de atualização da interface estão definidos e **documentados**.
- [ ] A interface exibe a **data e hora da última atualização**.
- [ ] Os intervalos podem ser ajustados por configuração.

#### RNF03 — Desempenho
- [ ] A interface responde em tempo adequado ao acompanhamento contínuo (meta definida pela equipe e registrada, por exemplo: carregamento inicial e atualizações em poucos segundos).
- [ ] A coleta de vários serviços é feita de forma concorrente ou otimizada.
- [ ] O desempenho foi verificado com um volume de serviços representativo do ambiente real.
- [ ] Evidência: medição de tempo de resposta registrada.

#### RNF04 — Tolerância a falhas
- [ ] A queda de um serviço monitorado não interrompe a coleta dos demais.
- [ ] A queda de uma API auxiliar (por exemplo, Agregador de Métricas ou API de localização) não derruba a aplicação.
- [ ] Timeouts e novas tentativas estão configurados com valores razoáveis.
- [ ] O usuário recebe uma mensagem ou indicação adequada quando há falha.
- [ ] Os últimos dados válidos continuam acessíveis, identificados como possivelmente desatualizados.
- [ ] Testes simulam falhas de serviços e de APIs auxiliares.

#### RNF05 — Documentação técnica
- Seção Entregáveis de documentação.

---

## Entregáveis de documentação

A entrega só é concluída quando o repositório contiver:

- [ ] **Instruções de execução:** pré-requisitos, instalação, configuração, como subir a aplicação e como rodar os testes.
- [ ] **Descrição da arquitetura:** componentes, responsabilidades, fluxo de dados e integração com o Agregador de Métricas e demais APIs (com diagrama).
- [ ] **Modelo de dados:** entidades, atributos, relacionamentos e como o histórico de coletas é armazenado (com diagrama).
- [ ] **Documentação dos endpoints desenvolvidos pela equipe:** método, rota, parâmetros, exemplos de requisição/resposta e códigos de erro (por exemplo, OpenAPI/Swagger).
- [ ] **Configuração de acesso às APIs auxiliares:** URLs, autenticação, variáveis de ambiente, exemplo de `.env.example` e comportamento esperado em caso de falha.
- [ ] **Parâmetros de operação:** intervalos de coleta e atualização, timeouts e demais valores configuráveis.
- [ ] **Regras de cálculo:** fórmulas de consumo energético e emissão de CO₂e, unidades e fatores adotados.

---
