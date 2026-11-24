# 🧮 Cálculos de consumo energético e emissões do GreenER

← [Voltar à documentação](README.md)

## 1. Objetivo

Este documento descreve o modelo simplificado utilizado pelo GreenER para estimar o consumo energético dos serviços monitorados e as emissões de dióxido de carbono equivalente (CO₂e).

O modelo utiliza métricas de infraestrutura e o fator regional de intensidade de carbono. Seu objetivo é produzir estimativas comparáveis entre serviços e períodos. Ele **não mede diretamente** o consumo elétrico real de servidores ou datacenters.

A implementação está em `backend/src/calculos/calculo-energia.ts`. A classe `CalculadoraEnergia` coordena a obtenção do fator regional e o cálculo completo da coleta.

## 2. Variáveis e fatores utilizados

O cálculo considera CPU, memória RAM, disco, rede, duração da amostra e intensidade de carbono da região.

| Variável | Descrição | Unidade |
|---|---|---|
| `cpu_percent` | Percentual de utilização da CPU informado pela API de métricas. | % |
| `CPU_W` | Potência de referência da CPU a 100% de utilização. | W |
| `memory_gb` | Memória informada para o serviço. | GB |
| `RAM_W_POR_GB` | Fator de potência adotado para memória. | W/GB |
| `disk_gb` | Métrica de disco informada para o serviço. | GB |
| `DISCO_W_POR_GB` | Fator de potência adotado para disco. | W/GB |
| `network_gb` | Métrica de rede informada para o serviço. | GB |
| `REDE_W_POR_GB` | Fator de potência adotado para rede. | W/GB |
| `collection_interval_seconds` | Duração da amostra informada pela API de métricas. | s |
| `carbon_intensity_gco2e_per_kwh` | Intensidade de carbono da região. | gCO₂e/kWh |

### 2.1 Fatores de potência do código

Os fatores estão definidos em `FATORES_POTENCIA`:

| Recurso | Constante | Valor |
|---|---|---:|
| CPU a 100% | `CPU_W` | 100 W |
| Memória | `RAM_W_POR_GB` | 0,375 W/GB |
| Disco | `DISCO_W_POR_GB` | 0,01 W/GB |
| Rede | `REDE_W_POR_GB` | 0,02 W/GB |

Esses fatores são constantes da implementação atual, não parâmetros editáveis pela interface.

## 3. Estimativa de potência

A potência estimada é a soma das parcelas atribuídas à CPU, memória, disco e rede.

### 3.1 Potência da CPU

```text
Potência CPU (W) =
  (Uso de CPU (%) / 100) × 100 W
```

### 3.2 Potência da memória

```text
Potência Memória (W) =
  Memória (GB) × 0,375 W/GB
```

### 3.3 Potência do disco

```text
Potência Disco (W) =
  Disco (GB) × 0,01 W/GB
```

### 3.4 Potência da rede

```text
Potência Rede (W) =
  Rede (GB) × 0,02 W/GB
```

### 3.5 Potência total estimada

```text
Potência Estimada (W) =
  Potência CPU +
  Potência Memória +
  Potência Disco +
  Potência Rede
```

A implementação arredonda a potência calculada para oito casas decimais.

## 4. Estimativa de energia

A energia é calculada pela potência estimada e pela duração da amostra recebida da API de métricas.

```text
Duração (h) = collection_interval_seconds / 3600

Energia (kWh) =
  Potência Estimada (W) × Duração (h) / 1000
```

O divisor `1000` converte watt-hora para quilowatt-hora.

**Importante: existem dois intervalos diferentes no projeto.**

- `collection_interval_seconds`: duração da amostra fornecida pela API externa. Este é o valor utilizado no cálculo de energia e armazenado com a coleta.
- `intervalo_coleta_segundos`: intervalo de agendamento definido pela aplicação e persistido na tabela `configuracoes`. Este valor determina quando a próxima coleta será executada.

O backend utiliza o segundo para agendar a rotina e o primeiro para calcular a energia da amostra. Alterar um deles não significa alterar o outro.

## 5. Estimativa de emissões de CO₂e

A emissão estimada é calculada multiplicando a energia pela intensidade de carbono correspondente à região do serviço.

```text
CO₂e (g) =
  Energia (kWh) × Intensidade de Carbono (gCO₂e/kWh)
```

O backend consulta a Greener Carbon Intensity API usando `location.region_code` da API de métricas.

Quando não há código de região, ou quando a consulta da intensidade de carbono falha, o cálculo completo não é concluído. As métricas recebidas podem ser preservadas, mas os campos de potência, energia e emissão permanecem sem resultado calculado. O sistema não inventa uma intensidade regional nem substitui dados ausentes por zero.

## 6. Fórmula consolidada

```text
CO₂e (g) =
  [
    (
      (CPU (%) / 100 × 100 W)
      + (RAM (GB) × 0,375 W/GB)
      + (Disco (GB) × 0,01 W/GB)
      + (Rede (GB) × 0,02 W/GB)
    )
    × (Duração da amostra (s) / 3600)
    / 1000
  ]
  × Intensidade de Carbono (gCO₂e/kWh)
```

## 7. Exemplo de cálculo conforme o teste atual

O teste `backend/src/calculos/calculo-energia.test.ts` utiliza o seguinte conjunto de dados:

### 7.1 Dados de entrada

| Parâmetro | Valor |
|---|---:|
| Uso de CPU | 10% |
| Potência de referência da CPU | 100 W |
| Memória | 2 GB |
| Fator de memória | 0,375 W/GB |
| Disco | 10 GB |
| Fator de disco | 0,01 W/GB |
| Rede | 0,5 GB |
| Fator de rede | 0,02 W/GB |
| Duração da amostra | 60 segundos |
| Intensidade de carbono | 433 gCO₂e/kWh |

### 7.2 Cálculo da potência

```text
CPU = 10 / 100 × 100 = 10 W
RAM = 2 × 0,375 = 0,75 W
Disco = 10 × 0,01 = 0,10 W
Rede = 0,5 × 0,02 = 0,01 W

Potência Estimada = 10 + 0,75 + 0,10 + 0,01
Potência Estimada = 10,86 W
```

### 7.3 Cálculo da energia

```text
Duração = 60 / 3600 = 0,016666... h

Energia = 10,86 × (60 / 3600) / 1000
Energia = 0,000181 kWh
```

### 7.4 Cálculo das emissões

```text
CO₂e = 0,000181 × 433
CO₂e = 0,078373 gCO₂e
```

Portanto, para os dados usados no teste atual, a emissão calculada é **0,078373 gCO₂e**, antes de qualquer formatação para apresentação.

O teste verifica a potência de `10,86 W`, a duração de 60 segundos e que os resultados de energia e emissão são positivos. O título histórico do teste ainda contém a referência `0.0722 gCO2e`, mas esse valor não é assertado e não corresponde aos parâmetros atualmente utilizados no corpo do teste. O exemplo documentado aqui segue os valores efetivos do código.

## 8. Precisão e validações

As funções de cálculo arredondam os resultados para oito casas decimais por meio de `toFixed(8)`:

- potência estimada;
- energia em kWh;
- emissão de CO₂e em gramas.

As funções de cálculo rejeitam valores negativos para as métricas utilizadas, potência, duração e intensidade de carbono. A integração também valida o formato e a faixa das respostas das APIs antes de encaminhar os valores para o cálculo.

Valores iguais a zero são válidos e não devem ser confundidos com valores ausentes (`null`).

## 9. Cálculos por serviço e comparação entre regiões

O modelo é aplicado individualmente a cada coleta de serviço. Os resultados persistidos permitem consultar tendências e comparar serviços por período.

Para realizar comparações coerentes, é necessário considerar:

- a mesma metodologia e os mesmos fatores de conversão;
- unidades compatíveis;
- períodos e durações de amostra comparáveis;
- o fator de intensidade de carbono correspondente à região e aos dados utilizados;
- a disponibilidade e a qualidade das métricas.

O ranking e a comparação utilizam os resultados persistidos no histórico. Eles não recalculam potência nem CO₂e na camada de frontend.

## 10. Fontes e rastreabilidade

- **Greener Metrics Aggregator API:** https://metrics.unilaunch.org/docs
- **Greener Carbon Intensity API:** https://carbon.unilaunch.org/docs
- **Especificação GreenER:** https://docs.unilaunch.org/share/x29w8jgwdb/p/greener-abp-2-semestre-b7FiqU6UC1
- **Implementação:** `backend/src/calculos/calculo-energia.ts`
- **Testes:** `backend/src/calculos/calculo-energia.test.ts`

## 11. Considerações finais

A aplicação consistente do modelo transforma métricas de infraestrutura em indicadores estimados de consumo energético e emissão de CO₂e. A interpretação dos resultados deve considerar as premissas do modelo, a duração de cada amostra, o fator regional e a disponibilidade dos dados de entrada.

Para consultar como os resultados são armazenados e disponibilizados pela API, veja [`arquitetura.md`](./arquitetura.md) e [`api.md`](./api.md).

---

**Green Stack · FATEC Jacareí · Desenvolvimento de Software Multiplataforma · 2026**
