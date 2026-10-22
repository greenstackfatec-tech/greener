# Frontend GreenER

O container serve `index.html` pelo Nginx na porta 80. A página atual é um painel mínimo de disponibilidade do ambiente e verifica `GET /api/health/ready`. O Nginx encaminha as requisições `/api/` ao serviço `backend`.

Com o Compose iniciado, acesse `http://localhost:8080` (ou a porta configurada em `FRONTEND_PORT`). A interface completa do produto ainda não está implementada.