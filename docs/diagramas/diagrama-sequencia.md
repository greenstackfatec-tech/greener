# Diagramas de Sequência

← [Voltar aos diagramas](README.md)

> Tarefa: **DW-003.1** · Sprint 1
> Mostram a ordem das mensagens entre as partes do sistema nos três fluxos principais do GreenER.

---

## 1. Coleta periódica de métricas

Fluxo principal do sistema (RF01, RF03, RF04, RF05, RF06, RF07, RNF04). Roda sozinho no intervalo configurado, sem ação do usuário.

```mermaid
sequenceDiagram
    autonumber
    participant R as Rotina de coleta<br/>(ColetasService)
    participant DB as PostgreSQL
    participant M as Agregador de Métricas
    participant C as API de Intensidade<br/>de Carbono
    participant K as CalculoEmissao

    R->>DB: SELECT valor FROM configuracoes<br/>WHERE chave = 'intervalo_coleta_segundos'
    DB-->>R: intervalo

    loop A cada intervalo
        R->>M: GET /services
        alt API respondeu
            M-->>R: lista de serviços + localização
            R->>DB: upsert em servicos (incluídos e que retornaram)
            R->>DB: UPDATE servicos SET status = 'removido'<br/>(os que sumiram da lista)
        else Timeout ou erro de rede
            M--xR: ErroApi
            R->>DB: INSERT em logs_sistema (falha na coleta)
            Note over R: A rotina não para.<br/>Tenta de novo no próximo ciclo.
        end

        loop Para cada serviço
            R->>M: GET /metrics/{id_servico}
            alt Métricas recebidas
                M-->>R: CPU, memória, disco, rede, intervalo
                R->>C: GET /regions/{region_code}/carbon-intensity
                C-->>R: gCO₂e/kWh da região
                R->>K: calcular(métricas, duração, fator)
                K-->>R: potência (W), energia (kWh), emissão (gCO₂e)
                R->>DB: INSERT em metricas_servico<br/>(status_coleta = 'sucesso')
            else Serviço respondeu sem métricas
                M-->>R: resposta sem dados
                R->>DB: INSERT em metricas_servico<br/>(status_coleta = 'sem_metricas')
            else Timeout, erro de rede ou HTTP 5xx
                M--xR: ErroApi
                R->>DB: INSERT em metricas_servico<br/>(status_coleta = 'indisponivel')
                R->>DB: UPDATE servicos SET status = 'indisponivel'
            end
        end
    end
```

---

## 2. Consulta do dashboard

O usuário abre o dashboard e a tela se atualiza sozinha (RF08, RF09, RF11, RNF02).

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as Frontend<br/>(React)
    participant B as Backend<br/>(ColetasController)
    participant DB as PostgreSQL

    U->>F: Abre o dashboard
    F->>F: Mostra estado "carregando"

    par Serviços
        F->>B: GET /servicos (Authorization: Bearer JWT)
        B->>DB: SELECT última coleta de cada serviço
        DB-->>B: serviços + métricas + energia + CO₂e
        B-->>F: 200 OK (JSON)
    and Indicadores
        F->>B: GET /indicadores
        B->>DB: SELECT SUM(energia_kwh), SUM(emissao_co2e_g),<br/>COUNT por status
        DB-->>B: totais
        B-->>F: 200 OK (JSON)
    end

    alt Sucesso
        F-->>U: Tabela de serviços, cards e última atualização
    else Erro no backend
        F-->>U: Estado de erro, sem derrubar a tela
    end

    loop Polling no intervalo configurado
        F->>B: GET /servicos e GET /indicadores
        B-->>F: dados atualizados
        F-->>U: Atualiza a tela e o horário da última atualização
    end
```

---

## 3. Login

Autenticação com JWT para acessar as rotas protegidas (RP06).

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as Frontend<br/>(React)
    participant B as Backend<br/>(AuthController)
    participant DB as PostgreSQL

    U->>F: Informa e-mail e senha
    F->>B: POST /auth/login {email, senha}
    B->>DB: SELECT id, nome, senha_hash FROM usuarios<br/>WHERE email = $1
    DB-->>B: usuário (ou nenhum)

    alt E-mail existe e senha confere com o hash
        B->>B: Gera token JWT
        B->>DB: INSERT em logs_sistema (acao = 'login')
        B-->>F: 200 OK {token}
        F->>F: Guarda o token
        F-->>U: Redireciona para o dashboard
    else Credenciais inválidas
        B-->>F: 401 Unauthorized
        F-->>U: "E-mail ou senha inválidos"
    end

    Note over F,B: Nas próximas requisições o frontend envia<br/>Authorization: Bearer token, e o middleware valida antes da rota.
```

> Os endpoints `/servicos`, `/indicadores` e `/auth/login` são a proposta para as Sprints 2 e 3 (TP16, TP18). Se o nome mudar na implementação, atualize este diagrama e o [`docs/api.md`](../api.md).

## Histórico de alterações

| Data | Alteração | Responsável |
| --- | --- | --- |
| 19/10/2026 | Criação dos diagramas de sequência | Renan |
