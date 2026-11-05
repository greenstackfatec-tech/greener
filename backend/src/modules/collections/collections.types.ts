import type { ResultadoCalculo } from "../../calculos/calculo-energia.ts";
import type { IntensidadeCarbono } from "../../integrations/carbon-api.ts";
import type { TipoErroApi } from "../../integrations/api-client.ts";

export type EtapaFalha = "descoberta" | "metricas" | "carbono" | "calculo" | "persistencia" | "configuracao";

export interface ContextoFalha {
  etapa: EtapaFalha;
  idExterno?: string;
  servicoId?: number;
  servicoNome?: string;
}

export interface FalhaPublica extends ContextoFalha {
  tipo: TipoErroApi | "interno";
  codigo: string;
  mensagem: string;
  ocorridoEm: string;
  statusHttp?: number;
}

export type CalculoColeta = ResultadoCalculo & { intensidadeCarbono: IntensidadeCarbono };

interface IdentificacaoColeta {
  servicoId: number;
  servicoNome: string;
  intervaloSegundos?: number;
}

export type ResultadoColeta = IdentificacaoColeta & (
  | { resultado: "completo"; status: "sucesso"; calculo: CalculoColeta; falha?: never; erro?: never }
  | { resultado: "parcial"; status: "sucesso"; calculo?: never; falha: FalhaPublica; erro: string }
  | { resultado: "sem_metricas"; status: "sem_metricas"; calculo?: never; falha?: never; erro?: never }
  | { resultado: "indisponivel"; status: "indisponivel"; calculo?: never; falha: FalhaPublica; erro: string }
);

export interface ResultadoRodadaColeta {
  coletadoEm: Date;
  totalServicos: number;
  sucessos: number;
  parciais: number;
  semMetricas: number;
  indisponiveis: number;
  erros: number;
  detalhes: ResultadoColeta[];
}
