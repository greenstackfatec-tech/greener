# 🧮 Cálculos de consumo energético e emissões do GreenER

<br>

## 1. Objetivo

Este documento descreve o modelo simplificado definido para estimar o consumo energético de aplicações de software e as emissões de dióxido de carbono equivalente (CO₂e), conforme o documento de especificação do desafio GreenER.

O modelo utiliza métricas de infraestrutura dos serviços monitorados e o fator regional de intensidade de carbono. Seu objetivo é produzir estimativas padronizadas que permitam comparar serviços, regiões e tendências. Ele **não mede diretamente** o consumo elétrico real de servidores ou datacenters.

<br>

## 2. Variáveis e fatores utilizados

O cálculo considera CPU, memória RAM, disco, rede, duração do intervalo de coleta e intensidade de carbono da região.

| Variável | Descrição | Unidade |
|---|---|---|
| `CPU` | Percentual de utilização da CPU informado para o serviço. | % |
| `CPU_MAX_WATTS` | Potência máxima de CPU adotada pelo modelo. | W |
| `RAM_GB` | Quantidade de memória utilizada. | GB |
| `RAM_WATTS_PER_GB` | Fator de consumo de memória utilizado pelo modelo. | W/GB |
| `DISK_GB` | Valor de uso de disco utilizado pelo modelo. | GB |
| `DISK_WATTS_PER_GB` | Fator de consumo de disco utilizado pelo modelo. | W/GB |
| `NETWORK_GB` | Valor de tráfego de rede utilizado pelo modelo. | GB |
| `NETWORK_WATTS_PER_GB` | Fator de consumo de rede utilizado pelo modelo. | W/GB |
| `TEMPO_HORAS` | Duração do intervalo de coleta. | h |
| `CARBON_INTENSITY` | Intensidade de carbono da região do serviço. | gCO₂e/kWh |

<br>

## 3. Estimativa de potência

A potência estimada é a soma das parcelas atribuídas a CPU, memória, disco e rede.

### 3.1 Potência da CPU

```text
Potência CPU (W) =
  (Uso de CPU (%) / 100) × Potência Máxima da CPU (W)
```

### 3.2 Potência da memória

```text
Potência Memória (W) =
  Memória Utilizada (GB) × Fator de Consumo da Memória (W/GB)
```

### 3.3 Potência do disco

```text
Potência Disco (W) =
  Uso de Disco (GB) × Fator de Consumo do Disco (W/GB)
```

### 3.4 Potência da rede

```text
Potência Rede (W) =
  Tráfego de Rede (GB) × Fator de Consumo da Rede (W/GB)
```

### 3.5 Potência total estimada

```text
Potência Estimada (W) =
  Potência CPU +
  Potência Memória +
  Potência Disco +
  Potência Rede
```

<br>

## 4. Estimativa de energia

A energia consumida durante um intervalo de coleta é calculada usando a potência média estimada e a duração do intervalo em horas.

```text
Energia (kWh) = Potência Estimada (W) × Tempo de Coleta (h) / 1000
```

O divisor `1000` converte watt-hora para quilowatt-hora.

<br>

## 5. Estimativa de emissões de CO₂e

A emissão estimada é calculada multiplicando a energia estimada pelo fator de intensidade de carbono correspondente à região onde o serviço está hospedado.

```text
CO₂e (g) = Energia (kWh) × Intensidade de Carbono (gCO₂e/kWh)
```

O fator regional representa a emissão média, em gramas de CO₂ equivalente, associada à geração de 1 kWh de energia elétrica naquela região.

<br>

## 6. Fórmula consolidada

A fórmula completa pode ser representada da seguinte maneira:

```text
CO₂e (g) =
  [
    (
      (CPU / 100 × CPU_MAX_WATTS)
      + (RAM_GB × RAM_WATTS_PER_GB)
      + (DISK_GB × DISK_WATTS_PER_GB)
      + (NETWORK_GB × NETWORK_WATTS_PER_GB)
    )
    × TEMPO_HORAS
    / 1000
  ]
  × CARBON_INTENSITY
```

<br>

## 7. Exemplo de cálculo

Considere um serviço executado durante 60 segundos em uma região com intensidade de carbono de `85 gCO₂e/kWh`.

### 7.1 Dados de entrada

| Parâmetro | Valor |
|---|---:|
| Uso de CPU | 50% |
| `CPU_MAX_WATTS` | 100 W |
| Memória utilizada | 2 GB |
| `RAM_WATTS_PER_GB` | 0,375 W/GB |
| Uso de disco | 10 GB |
| `DISK_WATTS_PER_GB` | 0,01 W/GB |
| Tráfego de rede | 1 GB |
| `NETWORK_WATTS_PER_GB` | 0,02 W/GB |
| Tempo de coleta | 60 segundos = aproximadamente 0,0167 h |
| Intensidade de carbono | 85 gCO₂e/kWh |

### 7.2 Cálculo da potência

```text
CPU = 50 / 100 × 100 = 50 W
RAM = 2 × 0,375 = 0,75 W
DISCO = 10 × 0,01 = 0,10 W
REDE = 1 × 0,02 = 0,02 W

Potência Estimada = 50 + 0,75 + 0,10 + 0,02
Potência Estimada = 50,87 W
```

### 7.3 Cálculo da energia

```text
Energia = 50,87 × 0,0167 / 1000
Energia ≈ 0,0008495 kWh
```

### 7.4 Cálculo das emissões

```text
CO₂e = 0,0008495 × 85
CO₂e ≈ 0,0722 gCO₂e
```

Portanto, para esse intervalo, a emissão estimada é de aproximadamente **0,072 gCO₂e**.

Os valores acima reproduzem o exemplo numérico apresentado na especificação do desafio. Como o tempo foi arredondado para `0,0167` hora, o resultado também é aproximado.

<br>

## 8. Cálculos por serviço e comparação entre regiões

O modelo pode ser aplicado individualmente a cada serviço monitorado. Os resultados permitem comparar o impacto estimado entre aplicações e avaliar como a intensidade de carbono regional influencia as emissões.

Para comparar resultados de maneira coerente, é necessário considerar:

- a mesma metodologia e os mesmos fatores de conversão;
- unidades compatíveis;
- intervalos de coleta equivalentes;
- o fator de intensidade de carbono correspondente à região e ao período analisados;
- a disponibilidade e a qualidade das métricas utilizadas.

Uma simulação de migração para outra região deve manter o consumo energético estimado e alterar o fator regional de intensidade de carbono, a menos que o cenário avaliado também considere mudanças na infraestrutura ou no consumo.

<br>

## 9. Fontes e rastreabilidade

As fontes de dados previstas para o projeto são:

- **Greener Metrics Aggregator API:** https://metrics.unilaunch.org/docs
- **Greener Carbon Intensity API:** https://carbon.unilaunch.org/docs
- **Especificação GreenER:** https://docs.unilaunch.org/share/x29w8jgwdb/p/greener-abp-2-semestre-b7FiqU6UC1

<br>

## 10. Considerações finais

A aplicação consistente do modelo simplificado permite transformar métricas de infraestrutura em indicadores comparáveis de consumo energético e emissões estimadas de CO₂e. Para preservar a confiabilidade desses indicadores, a implementação deve respeitar as fórmulas, as unidades e os fatores definidos na especificação do desafio, além de tratar explicitamente dados ausentes e falhas de integração.
<br>
 Para mais detalhes sobre a <b>Documentação Geral</b> clique <a href="https://github.com/greenstackfatec-tech/greener/blob/develop/docs/README.md">aqui</a>.

---

**FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**