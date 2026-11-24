# Frontend GreenER

O frontend do **GreenER** é a aplicação web utilizada para consultar o estado dos serviços monitorados, acompanhar indicadores ambientais e visualizar análises de energia e emissões de CO₂e.

Tecnologias principais: **React 19.3.1**, **TypeScript 6.0.3** e **Vite 8.3.5**. No ambiente Docker, o build é gerado com Node.js 24 e servido pelo Nginx.

<br>

## 1. Organização do projeto

O código-fonte está em `frontend/src/`.

| Diretório / arquivo | Responsabilidade |
|---|---|
| `main.tsx` e `App.tsx` | Inicialização e composição da aplicação. |
| `rotas.tsx` | Declaração das rotas públicas, privadas e de desenvolvimento. |
| `caminhos.ts` | Centralização dos caminhos de navegação. |
| `pages/` | Páginas de início, login, cadastro, dashboard, administração, histórico, ranking, comparação, mapa e estados. |
| `components/` | Componentes reutilizáveis, formulários, filtros, cartões, navegação e visualizações. |
| `services/` | Cliente HTTP e integração com autenticação, cadastro, serviços, indicadores, análises e configuração. |
| `hooks/` | Consultas de dados, atualização automática, filtros e acompanhamento da rotina. |
| `contexts/` e `providers/` | Estado e provedores compartilhados da aplicação. |
| `utils/` | Validações e funções auxiliares. |
| `assets/` | Imagens e recursos visuais. |
| `mock-servicos.ts` | Plugin Vite com respostas simuladas da API GreenER para desenvolvimento. |
| `vite.config.ts` | Configuração do Vite, proxy e modo mock. |

<br>

## 2. Telas e rotas

As rotas estão declaradas em `src/rotas.tsx`.

| Rota | Tela | Situação atual |
|---|---|---|
| `/` | Início | Apresenta o GreenER e consulta `GET /health/ready` para mostrar a disponibilidade do backend e do PostgreSQL. |
| `/login` | Login | Integrada a `POST /auth/login`, com validação, opção “Lembrar de mim” e tratamento de credenciais inválidas e limite de tentativas. |
| `/cadastro` | Cadastro | Formulário de pessoa física ou jurídica com validações no frontend; envia `POST /auth/register`. O backend persiste nome, e-mail e hash da senha, mas ainda ignora tipo de pessoa e CPF/CNPJ. |
| `/dashboard` | Visão geral | Apresenta indicadores consolidados, lista de serviços, estados, busca, filtros, ordenação e alternância entre cartões e tabela. |
| `/administrativa` | Área administrativa | Apresenta indicadores e serviços reais e consulta a configuração do intervalo de coleta. A alteração do intervalo ainda depende de endpoint PUT não implementado. |
| `/historico` | Histórico | Consulta o histórico de um serviço no período e apresenta a evolução de energia e CO₂e em gráfico. |
| `/ranking` | Ranking | Classifica serviços por energia ou CO₂e, usando total ou média por coleta, com período, aplicação, ordenação, resumo, tendência e paginação. |
| `/comparacao` | Comparação | Seleciona de dois a cinco serviços e compara os valores no mesmo período. |
| `/mapa` | Mapa | Apresenta um globo 3D estilizado com serviços que possuem latitude e longitude válidas. |
| `/dashboard/estados` | Galeria de estados | Rota de desenvolvimento para conferir estados visuais; não é registrada no build de produção. |

As rotas privadas são agrupadas pelo componente `RotaPrivada`. Sem token válido no armazenamento do navegador, o acesso é direcionado para `/login`.

<br>

## 3. Comunicação com o backend

O cliente HTTP está em `src/services/api.ts`. As telas utilizam as funções centralizadas, em vez de realizar chamadas `fetch` diretamente.

| Função | Método | Finalidade |
|---|---|---|
| `requisitar<T>(caminho)` | GET | Consulta recursos do backend. |
| `enviar<T>(caminho, corpo)` | POST | Envia dados em JSON. |
| `atualizar<T>(caminho, corpo)` | PUT | Envia alterações em JSON. |

A URL-base é `/api`.

- Em desenvolvimento normal, o Vite encaminha `/api/` para `http://localhost:3000`, removendo o prefixo `/api`.
- No container de produção, o Nginx encaminha `/api/` para o serviço `backend`, na porta `3000`.
- No modo `npm run dev:mock`, o plugin `mock-servicos.ts` responde às rotas simuladas e o proxy para o backend é desativado.

O cliente acrescenta `Authorization: Bearer <token>` quando existe um token salvo. Respostas fora de 2xx são convertidas em `ErroApi`, que disponibiliza status HTTP, código de erro e, quando enviado pelo backend, o valor de `Retry-After`.

Quando uma rota protegida retorna HTTP `401`, o cliente remove o token do navegador e redireciona para `/login?expired=1`. O `401` de `POST /auth/login` é tratado pela própria tela, sem acionar esse redirecionamento.
<br>

### 3.1 Principais endpoints consumidos

| Método | Caminho | Utilização |
|---|---|---|
| GET | `/health/ready` | Verificar backend e banco na tela inicial. |
| POST | `/auth/login` | Autenticar o usuário e obter JWT. |
| POST | `/auth/register` | Criar a conta com nome, e-mail e senha. |
| GET | `/services` | Consultar serviços e dados da última coleta. |
| GET | `/dashboard/indicadores` | Consultar indicadores consolidados. |
| GET | `/collections/rotina/status` | Consultar o diagnóstico da coleta no dashboard. |
| GET | `/monitoring-settings` | Consultar o intervalo de coleta salvo. |
| GET | `/analytics/historico/:servicoId` | Consultar histórico do serviço por período. |
| GET | `/analytics/ranking` | Consultar ranking por energia ou CO₂e. |
| GET | `/analytics/comparacao` | Consultar comparação entre serviços. |

Os contratos completos estão em [`docs/api.md`](../docs/api.md).

<br>

## 4. Autenticação e cadastro

### 4.1 Login

A tela chama `POST /auth/login`. Quando recebe um JWT:

- armazena em `localStorage` quando “Lembrar de mim” está marcado;
- armazena em `sessionStorage` quando a opção não está marcada.

O cliente HTTP envia o token automaticamente nas requisições seguintes.

O backend limita as tentativas incorretas por e-mail e pode responder HTTP `429` com `Retry-After`. A tela apresenta o tempo de espera e bloqueia novos envios durante a contagem regressiva.

### 4.2 Cadastro

A tela permite alternar entre pessoa física e pessoa jurídica e valida nome, CPF/CNPJ, e-mail e senha no frontend.

O endpoint `POST /auth/register` está implementado no backend. Atualmente, porém, ele persiste somente:

- `nome`;
- `email`;
- `senha_hash` (hash bcrypt da senha).

Os campos `tipoPessoa` e `documento` enviados pelo formulário são aceitos como campos adicionais, mas ignorados pelo backend. CPF/CNPJ ainda não são validados nem armazenados no banco, e o backend não emite o erro `document_already_exists`.

### 4.3 Logout e sessão expirada

O botão “Sair da conta” remove o token de `localStorage` e `sessionStorage` e navega para `/login`.

Quando uma requisição protegida recebe HTTP `401`, o cliente remove o token e redireciona para a tela de login.

<br>

## 5. Funcionalidades das telas

### 5.1 Dashboard

O dashboard consulta:

- `GET /services`, para serviços, estados, localização, métricas e resultados da última coleta;
- `GET /dashboard/indicadores`, para consumo total, emissão total e contagem de serviços;
- `GET /collections/rotina/status`, para o diagnóstico da rotina de coleta.

A tela oferece cartões ou tabela, busca por serviço/localização, filtro por estado, ordenação por nome, energia ou CO₂e, além dos filtros compartilhados de serviço, região e período.

O período selecionado é utilizado pelas telas de análise. A lista do dashboard continua apresentando a última coleta disponível de cada serviço.

Estados como ativo, indisponível, sem métricas, carregando, erro e lista vazia são apresentados separadamente. Campos ausentes são mostrados como não disponíveis, sem conversão artificial de `null` para zero.

### 5.2 Atualização automática

O dashboard, o histórico, o mapa e as áreas que acompanham os serviços utilizam o intervalo de atualização definido em `src/config.ts`.

| Intervalo | Padrão | Configuração |
|---|---:|---|
| Atualização da interface | 30 segundos | `VITE_INTERVALO_ATUALIZACAO_SEGUNDOS` no ambiente frontend; `INTERVALO_ATUALIZACAO_SEGUNDOS` na raiz para build Docker. |
| Coleta no backend | 60 segundos no seed | Chave `intervalo_coleta_segundos` da tabela `configuracoes`. |

O intervalo da interface tem mínimo de 5 segundos. Ele é independente do intervalo de coleta do backend.

Quando uma atualização falha depois de uma resposta válida, a interface preserva os dados anteriores, informa que podem estar desatualizados e permite tentar novamente. O ciclo automático é pausado com a aba oculta e retomado ao retornar à página.

### 5.3 Filtros compartilhados

A barra `components/FiltrosAnalise.tsx` e a lógica em `src/filtros.ts` permitem filtrar por serviço, região e período (1 hora, 24 horas, 7 dias ou personalizado).

O estado compartilhado é mantido em `sessionStorage` por `useFiltrosAnalise`, sendo utilizado no dashboard, histórico e comparação. O ranking possui seus próprios controles de período, aplicação, métrica, agregação e ordenação.

Datas personalizadas incompletas ou inválidas impedem o envio da consulta.

### 5.4 Histórico

A rota `/historico` utiliza `GET /analytics/historico/:servicoId`, exigindo JWT.

A tela permite escolher serviço e período e apresenta gráfico de linha com energia e CO₂e das coletas com status `sucesso` e valores disponíveis. Os dados são limitados e ordenados conforme os parâmetros enviados à API.

Estados de carregamento, erro e ausência de registros são apresentados sem inventar medições.

### 5.5 Ranking

A rota `/ranking` utiliza `GET /analytics/ranking`, exigindo JWT.

A tela permite escolher:

- métrica: energia ou CO₂e;
- agregação: total no período ou média por coleta;
- período: atalhos ou intervalo personalizado;
- escopo de aplicação;
- ordenação crescente ou decrescente.

A resposta detalhada inclui resumo, primeiro colocado, quantidade de serviços classificados, serviços sem dados e tendência em relação ao período anterior de mesma duração. A listagem é paginada em grupos de 20 serviços.

A unidade de CO₂e apresentada na tela é convertida de gramas para quilogramas. Valores ausentes são exibidos como traço.

### 5.6 Comparação

A rota `/comparacao` utiliza `GET /analytics/comparacao`, exigindo JWT.

A pessoa usuária seleciona de dois a cinco serviços e um período comum. A tela compara totais e médias de energia e CO₂e, com mínimo e máximo disponíveis pela resposta do backend.

Um serviço sem coletas no período permanece na comparação com valores zerados e aviso retornado pela API. Esse caso não deve ser interpretado como uma medição válida igual a zero.

### 5.7 Mapa

A rota `/mapa` mostra um globo 3D estilizado com um pino por serviço que possui latitude e longitude válidas. O desenho utiliza SVG com projeção ortográfica de `d3-geo` e os dados geográficos do pacote `world-atlas`.

- `src/mapa.ts`: validação de coordenadas, agrupamento e formatação.
- `src/components/GloboServicos.tsx`: globo interativo.
- `src/pages/MapaPage.tsx`: lista, detalhes do serviço e estados da tela.

Serviços sem coordenadas válidas continuam disponíveis no dashboard e são listados como fora do mapa. Serviços no mesmo local podem compartilhar um pino.

A interface não calcula coordenadas aproximadas por cidade e não possui endpoint para editar coordenadas.

### 5.8 Área administrativa

A rota `/administrativa` apresenta indicadores consolidados e a lista de serviços monitorados. O card de intervalo consulta `GET /monitoring-settings`.

O formulário está preparado para enviar `PUT /monitoring-settings`, mas o backend atual não registra essa rota. A tentativa de alteração retorna 404/405 e a tela mostra aviso de que o servidor ainda não permite salvar a configuração.

O card “Por recurso” foi removido porque o backend não disponibiliza uma base de dados adequada para apresentar essa distribuição como indicador real.

<br>

## 6. Desenvolvimento com dados simulados

O frontend possui um modo mock implementado em `mock-servicos.ts` e ativado pelo Vite quando executado com `npm run dev:mock`.

Na pasta `frontend`:

```bash
npm ci
npm run dev:mock
```

A aplicação fica disponível em `http://localhost:5173`. O modo mock não utiliza o backend nem o PostgreSQL.

O plugin simula:

| Método | Caminho | Conteúdo |
|---|---|---|
| GET | `/api/services` | Seis serviços fictícios com estados e localizações diferentes. |
| GET | `/api/dashboard/indicadores` | Indicadores calculados a partir dos serviços fictícios. |
| GET | `/api/analytics/historico/:servicoId` | Histórico sintético com variação aleatória. |
| GET | `/api/analytics/ranking` | Ranking fictício com total, média, tendência e resumo. |
| GET | `/api/analytics/comparacao` | Comparação simulada para os IDs selecionados. |
| POST | `/api/auth/login` | Token fictício para demonstração. |
| GET | `/api/__mock` | Consulta ou altera o cenário ativo. |

Cenários: `ok`, `vazio`, `erro`, `lento` e `rede`.

Para selecionar um cenário:

```text
http://localhost:5173/api/__mock?cenario=ok
http://localhost:5173/api/__mock?cenario=vazio
http://localhost:5173/api/__mock?cenario=erro
http://localhost:5173/api/__mock?cenario=lento
http://localhost:5173/api/__mock?cenario=rede
```

O cenário `lento` aplica atraso específico à rota de ranking. O cenário `vazio` não possui resposta completa para todas as rotas, inclusive o histórico. Para detalhes dos cenários e do mock das APIs externas do backend, consulte [`docs/mocks.md`](../docs/mocks.md).

<br>

## 7. Instalação e execução local

### 7.1 Pré-requisitos

- Node.js 24 para o ambiente de desenvolvimento e build do frontend;
- npm;
- backend disponível em `http://localhost:3000` para utilizar dados reais.

Para executar a aplicação completa com Docker Compose, consulte o [README principal](../README.md).

### 7.2 Instalar e iniciar

A partir da raiz do repositório:

```bash
cd frontend
npm ci
npm run dev
```

O Vite disponibiliza a aplicação em:

```text
http://localhost:5173
```

No modo normal, o Vite encaminha `/api/` ao backend. Para utilizar dados reais, o backend precisa estar iniciado e conectado ao PostgreSQL.

### 7.3 Scripts disponíveis

Execute na pasta `frontend`:

| Comando | Finalidade |
|---|---|
| `npm ci` | Instala as dependências fixadas no lockfile. |
| `npm run dev` | Inicia o Vite com proxy para o backend. |
| `npm run dev:mock` | Inicia o Vite com o mock de frontend. |
| `npm run typecheck` | Executa a checagem de tipos TypeScript. |
| `npm run lint` | Executa o ESLint. |
| `npm run build` | Executa `tsc -b` e gera o build em `dist/`. |
| `npm run preview` | Serve localmente o build gerado. |
| `npm test` | Executa testes utilitários com Node e testes de interface com Vitest. |

Antes de enviar alterações, execute:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

### 7.4 Testes

O script `npm test` executa testes de serviços, indicadores, filtros, comparação e mapa com Node, além da suíte de interface com Vitest, React Testing Library e jsdom.

Os testes cobrem o comportamento das funções de frontend e os componentes de interface. Para testes que dependem da API e do PostgreSQL, consulte os comandos de integração no [README do backend](../backend/README.md).

<br>

## 8. Responsividade

As telas possuem estilos responsivos para mobile e desktop. A implementação utiliza CSS e breakpoints específicos por área; o comportamento pode variar entre a tela inicial, autenticação, dashboard, área administrativa e visualizações analíticas.

Ao validar a interface, conferir pelo menos larguras de 320, 360, 390, 768 e 1024 px:

1. Não há rolagem horizontal fora de componentes que possuem rolagem própria, como a tabela do dashboard.
2. Elementos não ficam cortados ou sobrepostos.
3. Textos e controles permanecem legíveis e utilizáveis.
4. A navegação entre telas continua acessível.
5. O globo e os gráficos permanecem dentro de seus contêineres.

O build de produção utiliza Nginx 1.27 Alpine, conforme `frontend/Dockerfile`.

<br>

## 9. Documentação relacionada

- [README principal](../README.md)
- [Índice da documentação](../docs/README.md)
- [Documentação da API](../docs/api.md)
- [Arquitetura e modelo de dados](../docs/arquitetura.md)
- [Metodologia dos cálculos](../docs/calculos.md)
- [Mocks locais](../docs/mocks.md)
- [README do backend](../backend/README.md)

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
