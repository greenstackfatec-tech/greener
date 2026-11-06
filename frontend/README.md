# Frontend GreenER

Aplicação React 19 + TypeScript criada com Vite. Telas implementadas: início (consulta GET /api/health/ready e mostra se o backend e o banco estão disponíveis) e login (integrado ao JWT do backend).

## Estrutura

| Pasta | Responsabilidade | Conteúdo atual |
|---|---|---|
| `src/pages/` | Telas da aplicação | `InicioPage.tsx`, `LoginPage.tsx`, `DashboardPage.tsx`, `EstadosPage.tsx` |
| `src/components/` | Componentes de interface reutilizáveis | `StatusBackend.tsx`, `LayoutAutenticacao.tsx`, `CampoTexto.tsx`, `GraficoConsumo.tsx`, `CartaoEstado.tsx` |
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
| `/dashboard` | Dashboard | DW05, DW07 | Implementada (tabela, indicadores e estados visuais) |
| `/dashboard/estados` | Galeria dos estados do DD07 | DW07 | Só em desenvolvimento (`npm run dev`), para conferir com o mock |

O cliente HTTP fica em `src/services/api.ts`. `requisitar<T>(caminho)` (GET) e `enviar<T>(caminho, corpo)` (POST com JSON) fazem as chamadas a partir de `/api`; as telas não usam `fetch` diretamente. Respostas fora de 2xx viram `ErroApi` (com `status`, `codigo` e, no HTTP 429, `tentarNovamenteEmSegundos`). Se houver token salvo, o cliente envia `Authorization: Bearer <token>` automaticamente.

## Login

`src/services/auth.ts` chama `POST /auth/login` e `src/services/token.ts` guarda o JWT: em `localStorage` com "Lembrar de mim" marcado e em `sessionStorage` sem ele. Tokens expirados (1 hora) são descartados na leitura. Após entrar, a tela leva ao `/dashboard`. Conta de teste do seed: `teste@greener.com` / `greener123`.

Pendências que dependem de outras tarefas: recuperação de senha (sem endpoint), proteção das rotas privadas e logout (DW17/DW21) e redirecionamento de quem já está logado.

## Executar localmente

Requer Node 24.

```bash
cd frontend
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`. O Vite encaminha `/api/*` para o backend em `http://localhost:3000`, removendo o prefixo `/api`, igual ao Nginx no container.

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos e build de produção em `dist/` |
| `npm run typecheck` | Só a checagem de tipos |
| `npm run lint` | ESLint |
| `npm run preview` | Serve o `dist/` gerado |

## Docker

O `Dockerfile` usa dois estágios: o Node gera o `dist/` e o Nginx serve os arquivos na porta 80, encaminhando `/api/` ao serviço `backend`. Com o Compose iniciado, acesse `http://localhost:8080` (ou a porta configurada em `FRONTEND_PORT`).


## Estados visuais do dashboard (DW07)

Seguem o mock `docs/design/DD07 estados de interface .png`. O componente `CartaoEstado` desenha os seis estados e `/dashboard/estados` (só em desenvolvimento) mostra todos juntos para conferência.

| Estado | Onde aparece no dashboard |
|---|---|
| Ativo (verde) | Chip "Ativo" e valor de energia em verde, com "Última coleta há N min". |
| Indisponível (cinza) | Chip "Indisponível" e traço no lugar da leitura, com "Sem leitura atual". |
| Sem métricas (azul) | Chip "Sem métricas" e traço azul, com "Aguardando primeira coleta". |
| Carregando (azul) | Cartão com pontos animados na primeira carga. |
| Erro de atualização (vermelho) | Sem dados anteriores: cartão de erro com "Tentar de novo". Com dados anteriores: a tabela continua visível, os valores ficam vermelhos e um aviso informa que podem estar desatualizados (RNF04). |
| Estado vazio (âmbar) | Cartão "Comece adicionando" quando a lista vem vazia. |

O estado de cada serviço sai de `situacaoDoServico()` em `src/services/servicos.ts`. O horário da última atualização é o da última consulta bem-sucedida ao backend.

### Ver o dashboard sem backend

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
