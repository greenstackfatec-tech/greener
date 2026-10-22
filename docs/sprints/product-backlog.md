# Product Backlog

← [Voltar ao README](../README.md)

---

## Legenda

| Campo          | Valores                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Prioridade** | alta (essencial para o MVP) · média (importante) · baixa (desejável ou opcional)                 |
| **Disciplina** | BD = Banco de Dados · DD = Design Digital · DW = Desenvolvimento Web II · ES = Engenharia de Software II · TP = Técnicas de Programação I |
| **Sprint**     | 1 = base e coleta de dados (Review 19/10) · 2 = cálculo e dashboard (Review 09/11) · 3 = análise e login (Review 23/11) |

Os códigos entre parênteses são os requisitos do desafio (RF, RNF, RP).

---

## Tarefas

| ID       | Tarefa                                                                                                | Prioridade | Disciplina | Sprint  |
| :------- | :---------------------------------------------------------------------------------------------------- | :--------- | :--------- | :------ |
| **BD01** | Modelar as tabelas (serviços, coletas, intensidade de carbono, resultados, usuários e configurações) e seus relacionamentos | alta | BD | 1 |
| **BD02** | Escrever o `schema.sql` (DDL) com PKs, FKs, UNIQUE e CHECK (RP03)                                     | alta       | BD         | 1       |
| **BD03** | Criar a conexão do backend com o PostgreSQL (pool e variáveis de ambiente)                            | alta       | BD         | 2       |
| **BD04** | Criar os repositories com SQL parametrizado, sem ORM, para serviços (upsert) e coletas                | alta       | BD         | 2       |
| **BD05** | Criar o repository dos resultados calculados (potência, energia e CO₂e)                               | alta       | BD         | 2       |
| **BD06** | Criar as consultas de histórico, ranking e comparação por período (RF10, RF14, RF15)                  | alta       | BD         | 3       |
| **BD07** | Escrever o `database/README.md` com a ordem e os comandos para aplicar os scripts em um banco vazio   | média      | BD         | 2       |
| **DD01** | Definir a identidade visual (paleta, fontes e logo)                                                   | alta       | DD         | 1       |
| **DD02** | Definir o fluxo de navegação entre as telas (RP05)                                                    | alta       | DD         | 2       |
| **DD03** | Prototipar o dashboard: cards de indicadores e lista de serviços (desktop e mobile)                   | alta       | DD         | 1       |
| **DD04** | Prototipar as telas de histórico, ranking e comparação (desktop e mobile)                             | média      | DD         | 2       |
| **DD05** | Prototipar a tela de mapa (desktop e mobile)                                                          | baixa      | DD         | 2       |
| **DD06** | Prototipar o login e a área de configuração (desktop e mobile)                                        | média      | DD         | 1, 2    |
| **DD07** | Definir os estados visuais: carregando, erro, serviço indisponível e ativo sem métricas               | alta       | DD         | 2       |
| **DW01** | Criar o projeto frontend com React + TypeScript e organizar as pastas (pages, components, services, hooks, contexts, providers) (RP01) | alta | DW | 2       |
| **DW02** | Configurar as rotas entre as telas e o cliente HTTP em `services/` para consumir a API do backend     | alta       | DW         | 2       |
| **DW03** | Conteinerizar o projeto: Dockerfiles, `compose.yaml` (frontend, backend e PostgreSQL com volume) e `.env.example` (RP04) | alta | DW | 1, 2    |
| **DW04** | Criar o layout base das telas (header, menu e container)                                              | alta       | DW         | 2       |
| **DW05** | Implementar o dashboard: tabela de serviços com estado, localização, CPU, RAM, disco, rede, energia e CO₂e (RF01, RF09) | alta | DW | 2 |
| **DW06** | Implementar os cards de indicadores consolidados (RF08)                                               | alta       | DW         | 2       |
| **DW07** | Implementar os estados visuais (ativo, indisponível, ativo sem métricas), carregando e erro (RF02, RF05, RF06, RNF04) | alta | DW | 2 |
| **DW08** | Implementar a atualização automática (polling) e exibir a última atualização e o intervalo (RF11, RNF02) | alta    | DW         | 2       |
| **DW09** | Exibir país, região e cidade de cada serviço (RF12)                                                   | média      | DW         | 2       |
| **DW10** | Ajustar a responsividade de todas as telas para mobile (RNF01)                                        | média      | DW         | 2       |
| **DW11** | Implementar a tela de histórico com gráficos (RF10)                                                   | alta       | DW         | 3       |
| **DW12** | Implementar a tela de ranking por energia ou CO₂e, exibindo o período (RF14)                          | alta       | DW         | 3       |
| **DW13** | Implementar a tela de comparação entre dois ou mais serviços no mesmo período (RF15)                  | alta       | DW         | 3       |
| **DW14** | Implementar os filtros por serviço, região e período                                                  | média      | DW         | 3       |
| **DW15** | Implementar o mapa com os serviços que têm latitude e longitude (RF13, opcional no desafio)           | baixa      | DW         | 3       |
| **DW16** | Implementar a tela de login e enviar o token JWT nas requisições protegidas (RP06)                    | alta       | DW         | 3       |
| **DW17** | Implementar a área de configuração (intervalo de coleta) e o logout                                   | média      | DW         | 3       |
| **ES01** | Criar e manter o Product Backlog                                                                      | alta       | ES         | 1       |
| **ES02** | Escrever as user stories com critérios de aceitação (RP07)                                            | alta       | ES         | 2       |
| **ES03** | Criar o plano de entregas das três sprints                                                            | alta       | ES         | 1, 2    |
| **ES04** | Definir a Definition of Done                                                                          | alta       | ES         | 1       |
| **ES05** | Definir a convenção de Git (nome de branch, commit e Pull Request com o ID da tarefa) e proteger a `main` | alta   | ES         | 2       |
| **ES06** | Criar o Sprint Backlog da Sprint 1 e registrar a Sprint Review (19/10)                                | alta       | ES         | 1       |
| **ES07** | Criar o Sprint Backlog da Sprint 2 e registrar a Sprint Review (09/11)                                | alta       | ES         | 2       |
| **ES08** | Criar o Sprint Backlog da Sprint 3 e registrar a Sprint Review (23/11)                                | alta       | ES         | 3       |
| **ES09** | Criar e manter o README principal e os READMEs de cada pasta (RNF05)                                  | alta       | ES         | 1, 2, 3 |
| **ES10** | Documentar a arquitetura e o modelo de dados (`docs/arquitetura.md`)                                  | média      | ES         | 2       |
| **ES11** | Documentar os cálculos: fórmulas, unidades e exemplo (`docs/calculos.md`)                             | média      | ES         | 2       |
| **ES12** | Documentar os endpoints da API (`docs/api.md`)                                                        | média      | ES         | 2, 3    |
| **ES13** | Esclarecer as dúvidas em aberto com o cliente (área de configuração, constantes do cálculo, água)     | alta       | ES         | 1, 2    |
| **ES14** | Preparar a apresentação final                                                                         | média      | ES         | 3       |
| **ES15** | Conferir comandos, links e instruções em um clone limpo antes da entrega final                        | média      | ES         | 3       |
| **TP01** | Criar o projeto backend com Node.js + TypeScript (strict), servidor HTTP, rota `GET /health` e variáveis de ambiente (RP02) | alta | TP | 2       |
| **TP02** | Organizar o backend em módulos: routes, controllers, services e repositories                          | alta       | TP         | 2       |
| **TP03** | Investigar as APIs do cliente (formato de resposta, erros, campos de localização) e criar mocks locais | alta      | TP         | 1, 2    |
| **TP04** | Criar o cliente do Agregador de Métricas: consultar `/services` (RF01)                                | alta       | TP         | 1       |
| **TP05** | Criar o cliente do Agregador de Métricas: consultar `/metrics/{id_servico}` (RF03)                    | alta       | TP         | 1       |
| **TP06** | Criar a rotina de coleta periódica com intervalo configurável, tratando cada coleta como um novo estado (RF03, RF04, RF11) | alta | TP | 2       |
| **TP07** | Gravar serviços e coletas no banco                                                                    | alta       | TP         | 2       |
| **TP08** | Criar o cliente da API de Intensidade de Carbono, por região                                          | alta       | TP         | 2       |
| **TP09** | Implementar a classe de cálculo (potência, energia e CO₂e) com constantes em configuração e gravar o resultado de cada coleta (RF07) | alta | TP | 2 |
| **TP10** | Calcular os indicadores consolidados: consumo total, emissão total, serviços ativos e indisponíveis (RF08) | alta  | TP         | 2       |
| **TP11** | Detectar serviços incluídos, removidos e que retornaram (RF02)                                        | alta       | TP         | 2       |
| **TP12** | Detectar serviço indisponível: timeout, erro de rede e erro de servidor (RF05)                        | alta       | TP         | 2       |
| **TP13** | Detectar serviço ativo sem métricas (RF06)                                                            | alta       | TP         | 2       |
| **TP14** | Tratar erros e timeouts das chamadas externas para que uma falha não derrube o sistema (RNF04)        | alta       | TP         | 2       |
| **TP15** | Tratar localização e coordenadas ausentes (RF12, RF13)                                                | média      | TP         | 2       |
| **TP16** | Criar os endpoints de serviços e indicadores (RF09)                                                   | alta       | TP         | 2       |
| **TP17** | Criar os endpoints de histórico, ranking e comparação, com filtro de período (RF10, RF14, RF15)       | alta       | TP         | 3       |
| **TP18** | Implementar o login com JWT e o middleware de proteção de rotas (RP06)                                | alta       | TP         | 3       |
| **TP19** | Criar os endpoints protegidos da configuração (intervalo de coleta)                                   | média      | TP         | 3       |
| **TP20** | Escrever testes automatizados do cálculo e da detecção de estados                                     | média      | TP         | 2       |
| **TP21** | Medir e ajustar o desempenho do dashboard e das consultas (RNF03)                                     | baixa      | TP         | 3       |

---

## Datas das sprints

| Evento            | Data                                     |
| ----------------- | ---------------------------------------- |
| Sprint Review 1   | 19/10/2026 |
| Sprint Review 2   | 09/11/2026 |
| Sprint Review 3   | 23/11/2026 |
