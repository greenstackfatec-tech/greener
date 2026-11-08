# Frontend GreenER

O frontend do **GreenER** é a aplicação web utilizada para consultar o estado dos serviços monitorados e visualizar as informações disponibilizadas pelo backend.

Tecnologias principais: **React 19.3.1**, **TypeScript 6.0.3** e **Vite 8.3.5**. No ambiente Docker, a versão de produção é servida pelo Nginx.

| Pasta | Responsabilidade | Conteúdo atual |
|---|---|---|
| `src/pages/` | Telas da aplicação | `InicioPage.tsx`, `LoginPage.tsx`, `DashboardPage.tsx`, `EstadosPage.tsx` |
| `src/components/` | Componentes de interface reutilizáveis | `StatusBackend.tsx`, `LayoutAutenticacao.tsx`, `CampoTexto.tsx`, `GraficoConsumo.tsx`, `CartaoEstado.tsx`, `CardsIndicadores.tsx` |
| `src/services/` | Comunicação com o backend | `api.ts`, `auth.ts`, `token.ts`, `servicos.ts` |
| `src/assets/` | Imagens usadas pelas telas | `greener-icon.png` |
| `src/hooks/` | Lógica de interface reutilizável | `useProntidao.ts`, `useServicos.ts`, `useAgora.ts` |
| `src/contexts/` | Estado compartilhado entre componentes | `ProntidaoContext.ts` |
| `src/providers/` | Provedores de contexto e dependências | `ProntidaoProvider.tsx` |

## Telas e rotas

As rotas ficam em `src/rotas.tsx`. A tela de início é a única implementada. As demais rotas já estão registradas e mostram uma página provisória com o nome da tela, até as tarefas indicadas serem entregues.

| Rota | Tela | Tarefa | Situação |
|---|---|---|---|
| `/` | Início | DW18 | Implementada (mostra o status do backend) |
| `/login` | Login | DW19 | Implementada (JWT, "lembrar de mim", erros e bloqueio por tentativas) |
| `/cadastro` | Cadastro | DW20 | Página provisória |
| `/administrativa` | Administrativa | DW21 | Página provisória |
| `/dashboard` | Dashboard | DW05, DW06, DW07 | Implementada (cards de indicadores, tabela e estados visuais) |
| `/dashboard/estados` | Galeria dos estados do DD07 | DW07 | Só em desenvolvimento (`npm run dev`), para conferir com o mock |

O cliente HTTP fica em `src/services/api.ts`. `requisitar<T>(caminho)` (GET) e `enviar<T>(caminho, corpo)` (POST com JSON) fazem as chamadas a partir de `/api`; as telas não usam `fetch` diretamente. Respostas fora de 2xx viram `ErroApi` (com `status`, `codigo` e, no HTTP 429, `tentarNovamenteEmSegundos`). Se houver token salvo, o cliente envia `Authorization: Bearer <token>` automaticamente.

## Login
## 1. Pré-requisitos

Para desenvolvimento local:

- Node.js 24;
- npm;
- backend disponível em `http://localhost:3000` para utilizar os dados reais da API.

Para executar todo o ambiente com Docker, consulte o [README principal](../README.md).

## 2. Instalação e execução local

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

Durante o desenvolvimento, as chamadas em `/api/` são encaminhadas para `http://localhost:3000`, com remoção do prefixo `/api`, conforme `vite.config.ts`. Para consultas reais, o backend também precisa estar iniciado e conectado ao PostgreSQL.

## 3. Telas e rotas

As rotas estão declaradas em `src/rotas.tsx`, e seus caminhos ficam centralizados em `src/caminhos.ts`.

| Rota | Tela | Situação atual |
|---|---|---|
| `/` | Início | Apresenta o GreenER e a disponibilidade do backend e do banco. |
| `/login` | Login | Integrada a `POST /auth/login`, com validação, opção “Lembrar de mim” e tratamento de erros e limite de tentativas. |
| `/cadastro` | Cadastro | Formulário de pessoa física ou jurídica com validação no frontend. O endpoint de cadastro ainda não existe no backend, portanto o envio não conclui o registro. |
| `/dashboard` | Dashboard | Apresenta serviços, estados, busca e filtros. Os dados dependem dos campos enviados pelo backend. |
| `/administrativa` | Área administrativa | Protótipo com dados de demonstração. A página e a leitura da configuração de monitoramento estão implementadas; a alteração depende de endpoint ainda não disponível. |
| `/dashboard/estados` | Galeria de estados | Disponível somente em desenvolvimento para conferência com os mocks. |

**Observação sobre as rotas:** `src/rotas.tsx` contém mais de uma declaração para `/cadastro` e `/administrativa`. Revise essas entradas e mantenha uma única configuração por caminho antes de considerar a navegação dessas páginas definitiva.

### 3.1 Tela inicial

A tela inicial utiliza o contexto de prontidão para consultar `GET /health/ready`. O componente `StatusBackend` apresenta a disponibilidade do backend e do PostgreSQL.

### 3.2 Login

A tela de login chama `POST /auth/login`. Quando recebe um JWT, o frontend armazena o token:

- em `localStorage` quando “Lembrar de mim” está marcado;
- em `sessionStorage` quando a opção não está marcada.

Quando há token salvo, o cliente HTTP envia `Authorization: Bearer <token>`. A ação de sair remove o token.

Pendências que dependem de outras tarefas: recuperação de senha (sem endpoint), proteção das rotas privadas e logout (DW17/DW21) e redirecionamento de quem já está logado.
O backend limita tentativas incorretas e pode responder HTTP `429` com `Retry-After`. A tela apresenta o tempo de espera e bloqueia novos envios enquanto a contagem regressiva não termina. A recuperação de senha ainda não possui endpoint implementado.

### 3.3 Cadastro

O formulário permite alternar entre pessoa física e pessoa jurídica e valida os campos antes do envio. A integração foi preparada para `POST /auth/register`, mas esse endpoint ainda não está implementado no backend. Portanto, o cadastro não deve ser apresentado como funcionalidade concluída de ponta a ponta.

### 3.4 Dashboard

**Cards de indicadores consolidados (DW06, RF08).** No topo do dashboard, quatro cards mostram consumo total (kWh), emissão total (g CO₂e), serviços ativos e serviços indisponíveis. Os valores vêm de `GET /dashboard/indicadores` (rota pública), consultada por `useIndicadores` e apresentada por `components/CardsIndicadores.tsx`; não há nenhum número fixo no código. Os estados são:

| Estado | O que a tela mostra |
|---|---|
| Carregando | Um bloco cinza no lugar de cada número e a legenda “Carregando...”. |
| Sucesso | Os valores no formato pt-BR. Se consumo e emissão chegam `0`, a legenda avisa “Ainda sem coletas calculadas”, pois o backend devolve `0` quando não há coleta calculada. |
| Erro, sem dados anteriores | Traço (“—”) em cada card e um aviso com o botão “Tentar de novo”. O erro não vira zero. |
| Erro, com dados anteriores | Os últimos valores válidos continuam na tela, com aviso de que podem estar desatualizados (RNF04). |

Os cards são atualizados no mesmo intervalo da tabela (seção “Atualização automática”) e também pelo botão “Atualizar dados”. As contagens de ativos e indisponíveis seguem a regra do backend (status do serviço, sem os removidos), então “Serviços ativos” inclui os serviços ativos que ainda não enviaram métricas; já o filtro “Ativos” da tabela só considera os que têm coleta bem-sucedida.

O dashboard consulta os serviços por `GET /services` e apresenta estados, busca textual e filtro por situação. O diagnóstico da rotina é consultado por `GET /collections/rotina/status`.

A interface distingue estados como ativo, indisponível, sem métricas, carregando, erro de atualização e lista vazia. Campos que não chegam na resposta devem continuar sem valor, em vez de serem preenchidos com números fictícios.

A consulta do diagnóstico é repetida a cada trinta segundos. Quando uma atualização falha após uma resposta válida, o hook de serviços preserva os últimos dados válidos para que a tela possa informar que eles podem estar desatualizados.

### 3.5 Área administrativa

A área administrativa contém elementos de protótipo com dados demonstrativos para aplicações, consumo por recurso e gráficos. Esses valores não representam medições reais do ambiente.

O card de intervalo consulta `GET /monitoring-settings`, rota protegida por JWT. O frontend possui uma chamada preparada para `PUT /monitoring-settings`, mas o backend atual disponibiliza somente o GET. A alteração do intervalo depende da implementação do endpoint correspondente.

## 4. Organização dos arquivos

A estrutura atual de `frontend/src/` está organizada da seguinte forma:

| Diretório / arquivo | Responsabilidade |
|---|---|
| `App.tsx` | Composição da aplicação, provedores e roteamento. |
| `main.tsx` | Ponto de entrada da aplicação React. |
| `rotas.tsx` | Declaração das rotas. |
| `caminhos.ts` | Constantes com caminhos de navegação. |
| `pages/` | Páginas de início, login, cadastro, dashboard, administração e estados. |
| `components/` | Componentes reutilizáveis de interface, formulários, layouts e indicadores. |
| `services/` | Cliente HTTP e integração com endpoints de autenticação, configuração, serviços, coletas e indicadores. |
| `hooks/` | Lógica reutilizável de prontidão, serviços, horário e monitoramento. |
| `contexts/` | Contextos compartilhados da aplicação. |
| `providers/` | Provedores de contexto. |
| `assets/` | Imagens usadas na interface. |
| `utils/` | Funções auxiliares e validações. |

## 5. Comunicação com o backend

O cliente HTTP fica em `src/services/api.ts`. As telas utilizam as funções centralizadas, em vez de implementarem chamadas `fetch` diretamente.

| Função | Método | Finalidade |
|---|---|---|
| `requisitar<T>(caminho)` | GET | Consulta recursos do backend. |
| `enviar<T>(caminho, corpo)` | POST | Envia dados em JSON. |
| `atualizar<T>(caminho, corpo)` | PUT | Envia alterações em JSON. |

A URL base do cliente é `/api`. O cliente adiciona o token JWT quando existe um token salvo e converte respostas HTTP fora de 2xx em `ErroApi`, que disponibiliza status, código de erro e o valor de `Retry-After`, quando recebido.

### 5.1 Principais endpoints consumidos

| Método | Caminho | Utilização |
|---|---|---|
| GET | `/health/ready` | Prontidão do backend e do banco na tela inicial. |
| POST | `/auth/login` | Autenticação do usuário. |
| POST | `/auth/register` | Cadastro preparado no frontend, ainda sem implementação no backend. |
| GET | `/services` | Lista de serviços para o dashboard. |
| GET | `/dashboard/indicadores` | Indicadores consolidados consumidos pela interface. |
| GET | `/collections/rotina/status` | Diagnóstico da rotina de coleta. |
| GET | `/monitoring-settings` | Consulta do intervalo, protegida por JWT. |
| PUT | `/monitoring-settings` | Alteração preparada no frontend, ainda sem implementação no backend. |

Os contratos, parâmetros e exemplos de resposta estão em [`docs/api.md`](../docs/api.md).

## 6. Dados reais e dados demonstrativos

As telas precisam distinguir dados recebidos da API dos valores utilizados somente para prototipação.

| Origem | Onde é utilizado | Observação |
|---|---|---|
| API do backend | Início, login, dashboard e diagnóstico da coleta. | Os valores dependem das respostas efetivas dos endpoints. |
| `mock-servicos.ts` | Cenários de desenvolvimento do dashboard. | Dados simulados, não são medições reais. |
| `pages/administrativa-dados.ts` | Cards, gráfico e lista de aplicações da área administrativa. | Dados demonstrativos do protótipo. |

Quando um campo não é enviado pelo backend, a interface deve representar a ausência de informação, sem inventar valores ou transformar `null` em zero.

## 7. Desenvolvimento com dados simulados

O projeto possui um modo mock para desenvolver e conferir os estados do dashboard sem consultar o backend.

Na pasta `frontend`, execute:

```bash
npm run dev:mock
```

A aplicação ficará disponível em `http://localhost:5173`. O mock atende `GET /api/services` e `GET /api/dashboard/indicadores`. Sem backend, o diagnóstico da coleta (`GET /api/collections/rotina/status`) não é atendido, então o aviso de erro de atualização do painel de serviços aparece no modo mock; isso é esperado.

Para trocar o cenário, abra no navegador:

```text
http://localhost:5173/api/__mock?cenario=ok
http://localhost:5173/api/__mock?cenario=vazio
http://localhost:5173/api/__mock?cenario=erro
http://localhost:5173/api/__mock?cenario=lento
http://localhost:5173/api/__mock?cenario=rede
```

| Cenário | Comportamento |
|---|---|
| `ok` | Retorna serviços simulados com diferentes estados. |
| `vazio` | Retorna uma lista vazia. |
| `erro` | Retorna HTTP 502. |
| `lento` | Atrasa a resposta em três segundos. |
| `rede` | Encerra a conexão para simular falha de rede. |

Após trocar o cenário, use a ação de atualizar dados no dashboard para conferir o comportamento. Os mocks existem somente para desenvolvimento.

## 8. Scripts disponíveis

Execute os comandos dentro da pasta `frontend`:

| Comando | Finalidade |
|---|---|
| `npm ci` | Instala as dependências fixadas no lockfile. |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite. |
| `npm run dev:mock` | Inicia o Vite com o mock de serviços. |
| `npm run build` | Executa a checagem de tipos e gera o build em `dist/`. |
| `npm run typecheck` | Executa a checagem de tipos TypeScript. |
| `npm run lint` | Executa o ESLint. |
| `npm run preview` | Serve localmente o build gerado. |

Para validar o frontend antes de enviar um Pull Request:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

## 9. Docker

O `frontend/Dockerfile` utiliza dois estágios:

1. Node 24 instala as dependências e gera a versão de produção com `npm run build`;
2. Nginx 1.27 serve os arquivos gerados em `dist/`.

O arquivo `nginx.conf` encaminha chamadas em `/api/` para o serviço `backend`, na porta `3000`. O frontend é servido na porta `80` do container e, no Compose, fica disponível em `http://localhost:8080` por padrão.

Para iniciar frontend, backend e PostgreSQL juntos, siga a seção Docker do [README principal](../README.md).

## 10. Documentação relacionada

- [README principal](../README.md)
- [Documentação da API](../docs/api.md)
- [Arquitetura e modelo de dados](../docs/arquitetura.md)
- [Metodologia dos cálculos](../docs/calculos.md)
- [README do backend](../backend/README.md)

---

## Responsividade

As telas são feitas para celular, tablet e desktop (RNF01). A referência visual do celular são as imagens `docs/design/*-mobile.png`, todas com 390 px de largura. Nesta primeira versão, a responsividade foi verificada manualmente; o frontend ainda não tem testes automatizados de interface.

### Breakpoints

| Largura | Onde é usada | O que muda |
|---|---|---|
| até 359 px | Início, Administrativa | Telas muito estreitas: o status da prévia volta a uma coluna e o valor dos indicadores diminui para 28 px. |
| até 640 px | Início | Celular: cabeçalho só com "Entrar", título de 32 px em 390 px, botões em coluna e prévia compacta. |
| até 700 px | Dashboard | Celular: menu lateral só com ícones (62 px), cartões em uma coluna e filtros empilhados. |
| até 900 px | Início | Tablet: hero e etapas em uma coluna. |
| até 1023 px | Login, Cadastro, Administrativa | Celular e tablet: campos de 16 px e alvos de toque de 44 px. O layout de desktop começa em 1024 px. |
| até 1100 px | Dashboard | Tablet: menu lateral de 205 px e indicadores em duas colunas. |

Login, Cadastro e Administrativa são escritos primeiro para o celular. Os estilos de desktop ficam em `@media (min-width: 1024px)`. Ao criar uma tela nova, siga o mesmo padrão e reaproveite esses pontos de quebra, em vez de criar valores novos.

### Regras de legibilidade e toque

- **Texto:** no celular, nenhum texto visível com menos de 12 px (0,75 rem). No Dashboard, essa regra vale até 700 px; em tablet ele mantém a densidade do desktop.
- **Campos de formulário:** 16 px no celular e no tablet. Com menos que isso, o Safari do iPhone dá zoom automático ao focar o campo.
- **Alvos de toque:** botões, links de ação, campos e itens de menu com no mínimo 44 px de altura. Quando o visual do Figma é menor, a área de toque é ampliada sem mudar o layout (por exemplo, com `::after` ou `min-height` compensado na margem).
- **Altura da tela:** use `min-height: 100vh` seguido de `min-height: 100dvh`. O `dvh` considera a barra de endereço do navegador no celular.

### Tamanhos de teste

Confira cada tela em **320, 360, 390, 768 e 1024 px**:

| Largura | Representa |
|---|---|
| 320 px | Celulares pequenos (limite inferior) |
| 360 px | Celulares Android comuns |
| 390 px | Tamanho do Figma (iPhone) |
| 768 px | Tablet em pé |
| 1024 px | Tablet deitado e início do desktop |

Em cada tamanho, verifique:

1. Não há rolagem horizontal na página (a tabela do Dashboard rola dentro do próprio contêiner).
2. Nada fica cortado ou sobreposto.
3. Em 390 px, o visual segue o protótipo em `docs/design/`.
4. Os textos continuam legíveis e os botões, fáceis de tocar.

### Como testar

Todos os comandos abaixo partem da pasta `frontend`.

**1. Instalar e subir com dados de exemplo (sem backend):**

```bash
npm ci
npm run dev:mock
```

Abra `http://localhost:5173`. Para trocar o cenário do Dashboard, acesse `http://localhost:5173/api/__mock?cenario=ok|vazio|erro|lento|rede` e clique em "Atualizar dados". O aviso de erro de atualização no modo mock é esperado (veja a seção do modo mock).

**2. Simular o celular no navegador:** abra o DevTools (`F12`), ative a barra de dispositivos (`Ctrl+Shift+M`), escolha "Responsive" e percorra os tamanhos de teste em `/`, `/login`, `/cadastro`, `/administrativa` e `/dashboard`.

**3. Ver a tela Administrativa sem backend.** A rota `/administrativa` exige token. Para conferir só o layout, rode no console do navegador (`F12 > Console`):

```js
sessionStorage.setItem("greener.token","x."+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+".x")
```

Esse token é falso e serve apenas para testar a interface no seu computador. Não o salve em arquivo e não o inclua em PR, print ou log. O backend continua recusando-o.

**4. Testar no celular de verdade** (única forma de confirmar o zoom do iPhone). Com o celular na mesma rede Wi-Fi do computador:

```bash
npm run dev:mock -- --host
```

Abra no celular o endereço da linha `Network` que o Vite mostra no terminal, por exemplo `http://192.168.0.25:5173`. Para usar dados reais, suba o backend (seção Docker do README principal) e use `npm run dev -- --host`.

**5. Testar com Docker (build de produção, servido pelo Nginx).** Na raiz do repositório, com o `.env` criado a partir do `.env.example` e o `JWT_SECRET` preenchido:

```bash
docker compose up --build -d
```

A aplicação fica em `http://localhost:8080`. Para encerrar, use `docker compose down` (sem `-v`, para preservar o banco).

**6. Checagens antes de abrir o Pull Request:**

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

`npm test` cobre apenas `servicos` e `indicadores`, não as telas. Anexe ao PR capturas de tela de pelo menos dois tamanhos (por exemplo, 390 e 768 px), sem tokens nem dados pessoais.

---

`npm run dev:mock` sobe o frontend com dados de exemplo para `/api/services` (arquivo `mock-servicos.ts`, só em desenvolvimento). Para trocar o cenário, abra `http://localhost:5173/api/__mock?cenario=ok|vazio|erro|lento|rede` e clique em "Atualizar dados" no dashboard. Para ver o erro com dados anteriores (RNF04), deixe em `ok`, mude para `erro` e atualize.

## Atualização automática (DW08)

O dashboard consulta `/api/services` sozinho, sem recarregar a página, e mostra no topo a **data e hora da última atualização** e o **intervalo** ("Atualiza a cada 30 s").

| Intervalo | Padrão | Onde ajustar |
|---|---|---|
| Atualização da interface | 30 s (mínimo 5 s) | `VITE_INTERVALO_ATUALIZACAO_SEGUNDOS` em `frontend/.env` (desenvolvimento) ou `INTERVALO_ATUALIZACAO_SEGUNDOS` no `.env` da raiz (Docker; é aplicado na construção da imagem) |
| Coleta de métricas no backend | 60 s | chave `intervalo_coleta_segundos` na tabela `configuracoes` |

- O padrão da interface é menor que o da coleta, para cada coleta aparecer pouco depois de acontecer.
- Busca, filtro e visão (cartões/tabela) não mudam durante a atualização.
- Se uma atualização falha, a tela mantém os últimos dados com o aviso de erro e tenta de novo no ciclo seguinte.
- O ciclo é pausado com a aba oculta e retomado, com atualização imediata, ao voltar.
- O botão "Atualizar dados" continua disponível para atualizar na hora.
**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
