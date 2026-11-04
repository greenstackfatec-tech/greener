# Frontend GreenER

Aplicação React 19 + TypeScript criada com Vite. Telas implementadas: início (consulta GET /api/health/ready e mostra se o backend e o banco estão disponíveis) e login (integrado ao JWT do backend).

## Estrutura

| Pasta | Responsabilidade | Conteúdo atual |
|---|---|---|
| `src/pages/` | Telas da aplicação | `InicioPage.tsx`, `LoginPage.tsx` |
| `src/components/` | Componentes de interface reutilizáveis | `StatusBackend.tsx`, `LayoutAutenticacao.tsx`, `CampoTexto.tsx`, `GraficoConsumo.tsx` |
| `src/services/` | Comunicação com o backend | `api.ts`, `auth.ts`, `token.ts` |
| `src/assets/` | Imagens usadas pelas telas | `greener-icon.png` |
| `src/hooks/` | Lógica de interface reutilizável | `useProntidao.ts` |
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
| `/dashboard` | Dashboard | DW05 | Página provisória |

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
