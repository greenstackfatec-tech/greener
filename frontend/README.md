# Frontend GreenER

Aplicação React 19 + TypeScript criada com Vite. Por enquanto há uma única tela, que consulta `GET /api/health/ready` e mostra se o backend e o banco de dados estão disponíveis.

## Estrutura

| Pasta | Responsabilidade | Conteúdo atual |
|---|---|---|
| `src/pages/` | Telas da aplicação | `InicioPage.tsx` |
| `src/components/` | Componentes de interface reutilizáveis | `StatusBackend.tsx` |
| `src/services/` | Comunicação com o backend | `api.ts` |
| `src/hooks/` | Lógica de interface reutilizável | `useProntidao.ts` |
| `src/contexts/` | Estado compartilhado entre componentes | `ProntidaoContext.ts` |
| `src/providers/` | Provedores de contexto e dependências | `ProntidaoProvider.tsx` |

## Telas e rotas

As rotas ficam em `src/rotas.tsx`. Por enquanto só a tela de início está registrada; as outras entram com as tarefas indicadas.

| Rota | Tela | Tarefa | Situação |
|---|---|---|---|
| `/` | Início | DW18 | Registrada (mostra o status do backend) |
| `/login` | Login | DW19 | A implementar |
| `/cadastro` | Cadastro | DW20 | A implementar |
| `/administrativa` | Administrativa | DW21 | A implementar |
| `/dashboard` | Dashboard | DW05 | A implementar |

O cliente HTTP fica em `src/services/api.ts`. A função `requisitar<T>(caminho)` faz as chamadas a partir de `/api`; as telas não usam `fetch` diretamente.

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
