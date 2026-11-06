# Frontend GreenER

O frontend do **GreenER** é a aplicação web utilizada para consultar o estado dos serviços monitorados e visualizar as informações disponibilizadas pelo backend.

Tecnologias principais: **React 19.3.1**, **TypeScript 6.0.3** e **Vite 8.3.5**. No ambiente Docker, a versão de produção é servida pelo Nginx.

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

O backend limita tentativas incorretas e pode responder HTTP `429` com `Retry-After`. A tela apresenta o tempo de espera e bloqueia novos envios enquanto a contagem regressiva não termina. A recuperação de senha ainda não possui endpoint implementado.

### 3.3 Cadastro

O formulário permite alternar entre pessoa física e pessoa jurídica e valida os campos antes do envio. A integração foi preparada para `POST /auth/register`, mas esse endpoint ainda não está implementado no backend. Portanto, o cadastro não deve ser apresentado como funcionalidade concluída de ponta a ponta.

### 3.4 Dashboard

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

A aplicação ficará disponível em `http://localhost:5173`. O mock atende `GET /api/services`.

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

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
