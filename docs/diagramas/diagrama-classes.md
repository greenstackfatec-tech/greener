# Diagrama de Classes

← [Voltar aos diagramas](README.md)

> Tarefa: **DW-003** · Sprint 1
> Mostra as classes do domínio do GreenER, seus atributos e como se relacionam. Serve de base para a modelagem do banco ([`database/schema.sql`](../../database/schema.sql)).

---

## 1. Classes de domínio

Cada classe vira uma tabela no PostgreSQL. Os nomes dos atributos são os mesmos das colunas.

```mermaid
classDiagram
    direction LR

    class Usuario {
        +id: number
        +nome: string
        +email: string
        -senhaHash: string
        +perfil: PerfilUsuario
        +status: StatusUsuario
        +criadoEm: Date
        +autenticar(senha: string) boolean
    }

    class Aplicacao {
        +id: number
        +nome: string
        +descricao: string
        +criadoEm: Date
        +listarServicos() Servico[]
    }

    class Regiao {
        +id: number
        +nome: string
        +pais: string
        +fatorCo2eGKwh: number
        +unidade: string
        +anoReferencia: number
        +fonte: string
        +criadoEm: Date
    }

    class Servico {
        +id: number
        +nome: string
        +status: StatusServico
        +cidade: string
        +latitude: number
        +longitude: number
        +criadoEm: Date
        +temCoordenadas() boolean
    }

    class MetricaServico {
        +id: number
        +coletadoEm: Date
        +cpuPercentual: number
        +memoriaGb: number
        +discoGb: number
        +redeGb: number
        +intervaloSegundos: number
        +statusColeta: StatusColeta
        +potenciaEstimadaW: number
        +duracaoSegundos: number
        +energiaKwh: number
        +emissaoCo2eG: number
        +calculadoEm: Date
    }

    class Configuracao {
        +chave: string
        +valor: string
        +descricao: string
        +atualizadoEm: Date
    }

    class LogSistema {
        +id: number
        +acao: string
        +detalhes: JSON
        +criadoEm: Date
    }

    class PerfilUsuario {
        <<enumeration>>
        ADMINISTRADOR
        EDITOR
        VISUALIZADOR
    }

    class StatusUsuario {
        <<enumeration>>
        ATIVO
        INATIVO
    }

    class StatusServico {
        <<enumeration>>
        ATIVO
        INDISPONIVEL
        REMOVIDO
    }

    class StatusColeta {
        <<enumeration>>
        SUCESSO
        SEM_METRICAS
        INDISPONIVEL
    }

    Aplicacao "1" o-- "0..*" Servico : agrupa
    Regiao "1" -- "0..*" Servico : localiza
    Servico "1" *-- "0..*" MetricaServico : gera
    Usuario "0..1" -- "0..*" LogSistema : registra
    Usuario ..> PerfilUsuario
    Usuario ..> StatusUsuario
    Servico ..> StatusServico
    MetricaServico ..> StatusColeta
```

### Relacionamentos

| Relação | Multiplicidade | Significado |
| --- | --- | --- |
| Aplicação → Serviço | 1 para 0..* (agregação) | Uma aplicação agrupa vários serviços. |
| Região → Serviço | 1 para 0..* | Cada serviço fica em uma região, que tem o fator de emissão usado no cálculo. |
| Serviço → MetricaServico | 1 para 0..* (composição) | Cada coleta gera uma nova linha; ela não existe sem o serviço. |
| Usuário → LogSistema | 0..1 para 0..* | Uma ação pode ter usuário ou ser da rotina de coleta (sem usuário). |

> **Pendente no banco:** `perfil` e `status` do usuário aparecem nas telas de colaboradores ([design](../design/tela-colaboradores-opcoes-de-perfil.png)), mas ainda não existem como colunas em `usuarios` no `schema.sql`. Precisam ser adicionados quando o login (TP18) e a gestão de colaboradores forem implementados.

---

## 2. Classes do backend

Organização em camadas definida no backlog (TP02): **routes → controller → service → repository**, com as integrações externas separadas em `integrations/`.

```mermaid
classDiagram
    direction TB

    class ColetasRoutes {
        +registrar(app)
    }

    class ColetasController {
        +listarServicos(req, res)
        +listarIndicadores(req, res)
    }

    class ColetasService {
        -intervaloSegundos: number
        +iniciarColetaPeriodica()
        +executarColeta()
        -detectarEstado(servico) StatusColeta
    }

    class CalculoEmissao {
        +calcularPotencia(metricas) number
        +calcularEnergia(potenciaW, duracaoS) number
        +calcularEmissao(energiaKwh, fatorCo2e) number
    }

    class ColetasRepository {
        +salvarServico(servico)
        +salvarColeta(metrica)
        +listarUltimasColetas() MetricaServico[]
    }

    class Connection {
        <<pg Pool>>
        +query(sql, params)
    }

    class MetricsApi {
        <<integration>>
        +listarServicos() Servico[]
        +buscarServico(id) Servico
        +buscarMetricas(id) RespostaMetricas
    }

    class CarbonApi {
        <<integration>>
        +listarRegioes() RespostaRegioes
        +buscarRegiao(codigo) RegiaoCarbono
        +buscarIntensidadeCarbono(codigo) IntensidadeCarbono
    }

    class ApiClient {
        <<integration>>
        +consultarJson(base, variavelUrl, caminho, opcoes) unknown
    }

    class ErroApi {
        +tipo: TipoErroApi
        +statusHttp: number
        +codigoApi: string
    }

    class TipoErroApi {
        <<enumeration>>
        http
        timeout
        rede
        resposta_invalida
    }

    ColetasRoutes --> ColetasController
    ColetasController --> ColetasService
    ColetasService --> CalculoEmissao
    ColetasService --> ColetasRepository
    ColetasService --> MetricsApi
    ColetasService --> CarbonApi
    ColetasRepository --> Connection
    MetricsApi --> ApiClient
    CarbonApi --> ApiClient
    ApiClient ..> ErroApi : lança
    ErroApi ..> TipoErroApi
```

| Classe | Arquivo | Situação |
| --- | --- | --- |
| `ApiClient`, `ErroApi` | `backend/src/integrations/api-client.ts` | Implementado |
| `MetricsApi` | `backend/src/integrations/metrics-api.ts` | Implementado |
| `CarbonApi` | `backend/src/integrations/carbon-api.ts` | Implementado |
| `Connection` | `backend/src/db/connection.ts` | Planejado (BD03) |
| `ColetasRoutes`, `ColetasController`, `ColetasService`, `ColetasRepository` | `backend/src/modules/coletas/` | Planejado (TP02, TP06, TP07, BD04) |
| `CalculoEmissao` | a definir | Planejado (TP09, Sprint 2) |

## Histórico de alterações

| Data | Alteração | Responsável |
| --- | --- | --- |
| 19/10/2026 | Criação do diagrama de classes | Renan |
