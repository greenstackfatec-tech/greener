# Deploy no Render (plano gratuito)

Um único serviço web (frontend + backend) e um PostgreSQL, definidos em `render.yaml` na raiz.

1. Em https://dashboard.render.com, crie uma conta gratuita e conecte o GitHub.
2. **New → Blueprint**, escolha este repositório e o branch com o `render.yaml`.
3. Confirme. O Render cria o banco `greener-db` e o serviço `greener`, gera o `JWT_SECRET` e publica em `https://<nome>.onrender.com`.

Na primeira subida, `init-db.mjs` aplica `database/schema.sql` e `database/seed.sql` (só quando o banco está vazio).
Login de teste do seed: `teste@greener.com` / `greener123`.

Limites do plano gratuito: o serviço "dorme" após ~15 min sem acesso (a primeira visita depois disso leva ~1 min)
e a coleta automática só roda enquanto ele está acordado. O PostgreSQL gratuito expira após 30 dias.

Teste local da imagem: `docker build -f deploy/Dockerfile -t greener-deploy .` e rode com `PORT`, `PG*` e `JWT_SECRET`.
