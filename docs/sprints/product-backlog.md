# Product Backlog

← [Voltar ao README](../README.md)

<br>

## Legenda

| Campo | Valores |
|---|---|
| **Esforço (Pontos)** | Pontuação estimada de esforço (Fibonacci: 1, 2, 3, 5, 8), utilizada no planejamento e no Burndown. `—` indica atividade adicional sem estimativa formal na baseline da Sprint 3. |
| **Disciplina** | BD = Banco de Dados · DD = Design Digital · DW = Desenvolvimento Web II · ES = Engenharia de Software II · TP = Técnicas de Programação I · S2 = atividade de processo da Sprint 2 · S3 = atividade adicional de processo da Sprint 3. |
| **Sprint** | 1 = base e coleta de dados (Review 19/10) · 2 = integração, cálculo e dashboard (Review 09/11) · 3 = análise, autenticação e visualização (Review 23/11). |

Os códigos entre parênteses identificam os requisitos do desafio (RF, RNF e RP). O Product Backlog registra o escopo e a estimativa; a situação detalhada, os responsáveis e as evidências da execução ficam nos relatórios das sprints.

<br>

## Tarefas

<br>

| ID | Tarefa | Esforço (Pontos) | Disciplina | Sprint |
| :--- | :--- | :---: | :--- | :---: |
| **BD01** | Modelar as tabelas (serviços, coletas, intensidade de carbono, resultados, usuários e configurações) e seus relacionamentos | 8 | BD | 1 |
| **BD02** | Escrever o `schema.sql` (DDL) com PKs, FKs, UNIQUE e CHECK (RP03) | 5 | BD | 1 |
| **BD03** | Criar a conexão do backend com o PostgreSQL (pool e variáveis de ambiente) | 5 | BD | 2 |
| **BD04** | Criar repositories com SQL parametrizado, sem ORM, para serviços (upsert) e coletas | 8 | BD | 2 |
| **BD05** | Criar o repository dos resultados calculados (potência, energia e CO₂e) | 5 | BD | 2 |
| **BD06** | Criar consultas persistentes de histórico, ranking e comparação por período (RF10, RF14, RF15) | 5 | BD | 2 |
| **BD07** | Escrever o `database/README.md` com a ordem e os comandos para aplicar os scripts em um banco vazio | 2 | BD | 2 |
| **DD01** | Definir a identidade visual (paleta, fontes e logo) | 3 | DD | 1 |
| **DD02** | Definir o fluxo de navegação entre as telas (RP05) | 3 | DD | 2 |
| **DD03** | Prototipar o dashboard: cards de indicadores e lista de serviços (desktop e mobile) | 5 | DD | 1 |
| **DD04** | Prototipar as telas de histórico, ranking e comparação (desktop e mobile) | 13 | DD | 2 |
| **DD05** | Prototipar a tela de mapa (desktop e mobile), incluindo estado de serviço sem coordenadas | 3 | DD | 3 |
| **DD06** | Prototipar o login e a área de configuração (desktop e mobile) | 3 | DD | 2 |
| **DD07** | Definir os estados visuais: carregando, erro, serviço indisponível e ativo sem métricas | 5 | DD | 2 |
| **DW01** | Criar o projeto frontend com React + TypeScript e organizar as pastas (pages, components, services, hooks, contexts, providers) (RP01) | 8 | DW | 2 |
| **DW02** | Configurar as rotas entre as telas e o cliente HTTP em `services/` para consumir a API do backend | 5 | DW | 2 |
| **DW03** | Conteinerizar o projeto: Dockerfiles, `compose.yaml` (frontend, backend e PostgreSQL com volume) e `.env.example` (RP04) | 5 | DW | 2 |
| **DW04** | Criar o layout base das telas (header, menu e container) | 5 | DW | 2 |
| **DW05** | Implementar e validar o dashboard: serviços, estados, localização, métricas de infraestrutura, energia e CO₂e (RF01, RF09) | 8 | DW | 2, 3 |
| **DW06** | Implementar os cards de indicadores consolidados (RF08) | 3 | DW | 2 |
| **DW07** | Implementar os estados visuais (ativo, indisponível, ativo sem métricas), carregando e erro (RF02, RF05, RF06, RNF04) | 5 | DW | 2 |
| **DW08** | Implementar a atualização automática (polling) e exibir a última atualização e o intervalo da interface (RF11, RNF02) | 3 | DW | 2 |
| **DW09** | Exibir país, região e cidade de cada serviço (RF12) | 3 | DW | 2 |
| **DW10** | Padronizar a responsividade de todas as telas para desktop e celular (RNF01) | 5 | DW | 2, 3 |
| **DW11** | Implementar a tela de histórico com gráfico de linha de energia e CO₂e por serviço e período (RF10) | 8 | DW | 3 |
| **DW12** | Implementar a tela de ranking por energia ou CO₂e, com período, filtros, agregação e ordenação (RF14) | 5 | DW | 3 |
| **DW13** | Implementar a tela de comparação entre dois e cinco serviços no mesmo período (RF15) | 5 | DW | 3 |
| **DW14** | Implementar filtros por serviço, região e período, preservados durante a atualização e compartilhados pelas telas de análise | 3 | DW | 3 |
| **DW15** | Implementar o mapa/globo com serviços que possuem latitude e longitude válidas (RF13, opcional no desafio) | 3 | DW | 3 |
| **DW16** | Tratar o token vencido (HTTP 401) em todas as requisições protegidas, limpando a sessão e redirecionando para o login (RP06) | 5 | DW | 3 |
| **DW17** | Implementar o logout: limpar o token do navegador e retornar ao login (RP06) | 3 | DW | 3 |
| **DW18** | Implementar a tela de início responsiva | 5 | DW | 2 |
| **DW19** | Implementar a tela de login | 5 | DW | 2 |
| **DW20** | Implementar a tela de cadastro com validações de formulário | 5 | DW | 2 |
| **DW21** | Implementar a área administrativa, incluindo indicadores, serviços e consulta do intervalo de coleta | 5 | DW | 2, 3 |
| **DW22** | Retirar dados mockados de telas de produção, componentes fictícios e páginas sem rota | 3 | DW | 2, 3 |
| **ES01** | Criar e manter o Product Backlog | 3 | ES | 1, 2, 3 |
| **ES02** | Escrever as user stories com critérios de aceitação (RP07) | 5 | ES | 2 |
| **ES03** | Criar e manter o plano de entregas das três sprints | 5 | ES | 1, 2, 3 |
| **ES04** | Definir a Definition of Done | 3 | ES | 1 |
| **ES05** | Definir a convenção de Git (nome de branch, commit e Pull Request com o ID da tarefa) e proteger a `main` | 2 | ES | 2 |
| **ES06** | Criar o Sprint Backlog da Sprint 1 e registrar a Sprint Review (19/10) | 5 | ES | 1 |
| **ES07** | Criar o Sprint Backlog da Sprint 2 e registrar a Sprint Review (09/11) | 5 | ES | 2 |
| **ES08** | Criar o Sprint Backlog da Sprint 3, manter o burndown e registrar a Sprint Review (23/11) | 5 | ES | 3 |
| **ES09** | Criar, revisar e manter o README principal, os READMEs específicos e a documentação técnica para refletir a versão entregue (RNF05) | 1 | ES | 1, 2, 3 |
| **ES10** | Documentar a arquitetura e o modelo de dados (`docs/arquitetura.md`) | 2 | ES | 2, 3 |
| **ES11** | Documentar os cálculos: fórmulas, unidades, fatores e exemplo (`docs/calculos.md`) | 2 | ES | 2, 3 |
| **ES12** | Documentar e atualizar os contratos das rotas da API (`docs/api.md`), incluindo análise, autenticação, cadastro e configuração | 3 | ES | 2, 3 |
| **ES13** | Esclarecer as dúvidas em aberto com o cliente (área de configuração, constantes do cálculo, água) | 3 | ES | 2 |
| **ES14** | Preparar a apresentação final | 5 | ES | 3 |
| **ES15** | Conferir comandos, links e instruções em um clone limpo antes da entrega final | 3 | ES | 3 |
| **ES16** | Registrar atas das Daily Meetings das três sprints | 2 | ES | 1, 2, 3 |
| **ES17** | Criar e manter os READMEs do backend e do frontend | 3 | ES | 2, 3 |
| **TP01** | Criar o projeto backend com Node.js + TypeScript (strict), servidor HTTP, rotas de saúde e variáveis de ambiente (RP02) | 5 | TP | 2 |
| **TP02** | Organizar o backend em módulos: routes, controllers, services e repositories | 8 | TP | 2 |
| **TP03** | Investigar as APIs do cliente (formato de resposta, erros, campos de localização) e criar mocks locais | 3 | TP | 1, 2 |
| **TP04** | Criar o cliente do Agregador de Métricas: consultar `/services` (RF01) | 5 | TP | 1 |
| **TP05** | Criar o cliente do Agregador de Métricas: consultar `/metrics/{id_servico}` (RF03) | 5 | TP | 1 |
| **TP06** | Criar a rotina de coleta periódica com intervalo definido pela aplicação, tratando cada coleta como uma nova observação (RF03, RF04, RF11) | 5 | TP | 2 |
| **TP07** | Gravar serviços e coletas no banco | 5 | TP | 2 |
| **TP08** | Criar o cliente da API de Intensidade de Carbono, por região | 5 | TP | 2 |
| **TP09** | Implementar a classe de cálculo (potência, energia e CO₂e) com constantes configuradas e gravar o resultado de cada coleta (RF07) | 8 | TP | 2 |
| **TP10** | Calcular os indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08) | 3 | TP | 2 |
| **TP11** | Detectar serviços incluídos, removidos e que retornaram (RF02) | 8 | TP | 2 |
| **TP12** | Detectar serviço indisponível: timeout, erro de rede e erro de servidor (RF05) | 2 | TP | 2 |
| **TP13** | Detectar serviço ativo sem métricas (RF06) | 2 | TP | 2 |
| **TP14** | Tratar erros e timeouts das chamadas externas para que uma falha não derrube o sistema (RNF04) | 3 | TP | 2 |
| **TP15** | Tratar localização e coordenadas ausentes (RF12, RF13) | 2 | TP | 2 |
| **TP16** | Criar os endpoints de serviços e indicadores, incluindo última coleta e intervalo nos indicadores (RF09, RNF02) | 5 | TP | 2, 3 |
| **TP17** | Criar os endpoints de histórico, ranking e comparação, com filtros de período (RF10, RF14, RF15) | 5 | TP | 3 |
| **TP18** | Implementar cadastro de usuários, login JWT e middleware de proteção das rotas privadas (RP06) | 8 | TP | 2, 3 |
| **TP19** | Fazer a rotina utilizar o intervalo de coleta persistido pela aplicação e disponibilizar sua consulta autenticada (RNF02) | 3 | TP | 3 |
| **TP20** | Escrever testes automatizados do cálculo e da detecção de estados | 5 | TP | 2 |
| **TP21** | Medir e ajustar o desempenho do dashboard e das consultas (RNF03) | 3 | TP | 3 |
| **TP22** | Testar coletas consecutivas com valores diferentes para o mesmo serviço, garantindo que cada observação seja persistida separadamente (RF04) | 5 | TP | 3 |
| **S2-01** | Roteiro e gravação do vídeo da Sprint Review 2 | 4 | S2 | 2 |
| **S2-02** | Edição e publicação do vídeo da Sprint Review 2 | 4 | S2 | 2 |
| **S2-03** | Registrar atas das Daily Meetings da Sprint 2 | 2 | S2 | 2 |

<br>

## Atividades adicionais registradas na Sprint 3

<br>

As atividades abaixo foram executadas como escopo complementar ou de fechamento. Elas não receberam estimativa formal na baseline de 98 pontos do Sprint Backlog 3. São mantidas nesta seção para preservar a rastreabilidade sem alterar retroativamente a pontuação da sprint.

| ID / Issue | Tarefa | Esforço (Pontos) | Disciplina | Sprint |
|---|---|:---:|---|:---:|
| [S3-04 / #183](https://github.com/greenstackfatec-tech/greener/issues/183) | Exigir autenticação para abrir dashboard e demais telas internas (RP06) | — | DW | 3 |
| [S3-05 / #192](https://github.com/greenstackfatec-tech/greener/issues/192) | Diferenciar visualmente energia (kWh) e emissão de CO₂e (g), explicando a relação entre ambas | — | DW | 3 |
| [DW23 / #197](https://github.com/greenstackfatec-tech/greener/issues/197) | Configurar ESLint no backend e incluir lint e typecheck no CI | — | DW | 3 |
| [S3-01 / #202](https://github.com/greenstackfatec-tech/greener/issues/202) | Preparar o roteiro e gravar o vídeo da Sprint Review 3 | — | S3 | 3 |
| [S3-02 / #203](https://github.com/greenstackfatec-tech/greener/issues/203) | Editar e publicar o vídeo da Sprint Review 3 | — | S3 | 3 |

<br>

## Datas das sprints

| Evento | Data |
|---|---|
| Sprint Review 1 | 19/10/2026 |
| Sprint Review 2 | 09/11/2026 |
| Sprint Planning 3 | 10/11/2026 |
| Sprint Review 3 | 23/11/2026 |

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
