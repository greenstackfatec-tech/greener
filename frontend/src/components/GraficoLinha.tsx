import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./GraficoLinha.css";

/** Um ponto do gráfico de linha (energia ou CO₂e). */
export interface PontoGrafico {
  /** Data/hora da coleta (ISO 8601). */
  data: string;
  /** Valor de energia em kWh. */
  energia: number | null;
  /** Valor de CO₂e em gramas. */
  co2e: number | null;
}

/** Série do gráfico. */
interface Serie {
  /** Identificador único da série. */
  id: "energia" | "co2e";
  /** Rótulo exibido na legenda. */
  rotulo: string;
  /** Cor da linha e dos pontos. */
  cor: string;
  /** Cor da área (com transparência). */
  corArea: string;
  /** Gradiente ID para área. */
  gradienteId: string;
  /** Unidade exibida no tooltip. */
  unidade: string;
  /** Casas decimais para exibição. */
  casasDecimais: number;
  /** Valor mínimo da série (para escala). */
  min: number;
  /** Valor máximo da série (para escala). */
  max: number;
  /** Se a série está visível. */
  visivel: boolean;
  /** Qual eixo Y usar ("esquerda" | "direita"). */
  eixoY: "esquerda" | "direita";
}

/** Props do componente GraficoLinha. */
interface Props {
  /** Pontos do histórico já filtrados e ordenados (mais antigo primeiro). */
  pontos: PontoGrafico[];
  /** Séries a exibir (padrão: energia e CO₂e). */
  series?: Serie[];
  /** Altura do gráfico em pixels. */
  altura?: number;
  /** Margens do SVG. */
  margens?: { topo: number; direita: number; fundo: number; esquerda: number };
  /** Texto exibido quando não há pontos. */
  vazioTexto?: string;
  /** Callback quando a visibilidade de uma série muda. */
  aoAlternarSerie?: (id: "energia" | "co2e", visivel: boolean) => void;
  /** Mostra estatísticas abaixo do gráfico (padrão: true). */
  mostrarEstatisticas?: boolean;
}

/** Ponto projetado para detecção de hover/focus. */
interface PontoProjetado {
  x: number;
  y: number;
  valor: number;
  data: string;
  serie: Serie;
  timestamp: number;
}

/** Configuração de eixo Y. */
interface EixoYConfig {
  min: number;
  max: number;
  ticks: number[];
  series: Serie[];
}

/** Formata valor para tooltip. */
function formatarValor(valor: number | null, casas: number): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Extrai valor de uma série a partir do ponto. */
function valorDaSerie(ponto: PontoGrafico, serieId: "energia" | "co2e"): number | null {
  return serieId === "energia" ? ponto.energia : ponto.co2e;
}

/** Converte data ISO para timestamp (ms). */
function dataParaTimestamp(data: string): number {
  return new Date(data).getTime();
}

/** Gera ticks do eixo X (datas). */
function gerarTicksX(pontos: PontoGrafico[], quantidade = 5): { timestamp: number; rotulo: string }[] {
  if (pontos.length === 0) return [];
  const primeiro = dataParaTimestamp(pontos[0].data);
  const ultimo = dataParaTimestamp(pontos[pontos.length - 1].data);
  const intervalo = (ultimo - primeiro) / (quantidade - 1);
  const ticks: { timestamp: number; rotulo: string }[] = [];
  for (let i = 0; i < quantidade; i++) {
    const ts = primeiro + intervalo * i;
    const data = new Date(ts);
    const rotulo = data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    ticks.push({ timestamp: ts, rotulo });
  }
  return ticks;
}

/** Gera ticks do eixo Y (valores). */
function gerarTicksY(min: number, max: number, quantidade = 5): number[] {
  if (min === max) return [min];
  const ticks: number[] = [];
  const intervalo = (max - min) / (quantidade - 1);
  for (let i = 0; i < quantidade; i++) {
    ticks.push(min + intervalo * i);
  }
  return ticks;
}

/** Mapeia valor do domínio para coordenada SVG. */
function mapearX(timestamp: number, minX: number, maxX: number, largura: number): number {
  if (maxX === minX) return largura / 2;
  return ((timestamp - minX) / (maxX - minX)) * largura;
}

function mapearY(valor: number, minY: number, maxY: number, altura: number): number {
  if (maxY === minY) return altura / 2;
  return altura - ((valor - minY) / (maxY - minY)) * altura;
}

/** Gera path SVG para linha suave (curva catmull-rom simplificada). */
function gerarPath(
  pontos: PontoGrafico[],
  serieId: "energia" | "co2e",
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  largura: number,
  altura: number
): string {
  const validos = pontos
    .map((p) => ({
      x: mapearX(dataParaTimestamp(p.data), minX, maxX, largura),
      y: mapearY(valorDaSerie(p, serieId)!, minY, maxY, altura),
      valor: valorDaSerie(p, serieId),
    }))
    .filter((p) => p.valor !== null);

  if (validos.length < 2) return "";

  let path = `M${validos[0].x.toFixed(2)},${validos[0].y.toFixed(2)}`;
  for (let i = 1; i < validos.length; i++) {
    const xMid = (validos[i - 1].x + validos[i].x) / 2;
    const yMid = (validos[i - 1].y + validos[i].y) / 2;
    if (i === 1) {
      path += ` Q${validos[0].x.toFixed(2)},${validos[0].y.toFixed(2)} ${xMid.toFixed(2)},${yMid.toFixed(2)}`;
    } else {
      path += ` Q${validos[i - 1].x.toFixed(2)},${validos[i - 1].y.toFixed(2)} ${xMid.toFixed(2)},${yMid.toFixed(2)}`;
    }
  }
  if (validos.length > 1) {
    const last = validos[validos.length - 1];
    const prev = validos[validos.length - 2];
    path += ` Q${prev.x.toFixed(2)},${prev.y.toFixed(2)} ${last.x.toFixed(2)},${last.y.toFixed(2)}`;
  }
  return path;
}

/** Gera path SVG para área sob a linha. */
function gerarPathArea(
  pontos: PontoGrafico[],
  serieId: "energia" | "co2e",
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  largura: number,
  altura: number
): string {
  const validos = pontos
    .map((p) => ({
      x: mapearX(dataParaTimestamp(p.data), minX, maxX, largura),
      y: mapearY(valorDaSerie(p, serieId)!, minY, maxY, altura),
      valor: valorDaSerie(p, serieId),
    }))
    .filter((p) => p.valor !== null);

  if (validos.length < 2) return "";

  let path = `M${validos[0].x.toFixed(2)},${altura}`;
  path += ` L${validos[0].x.toFixed(2)},${validos[0].y.toFixed(2)}`;
  for (let i = 1; i < validos.length; i++) {
    const xMid = (validos[i - 1].x + validos[i].x) / 2;
    const yMid = (validos[i - 1].y + validos[i].y) / 2;
    if (i === 1) {
      path += ` Q${validos[0].x.toFixed(2)},${validos[0].y.toFixed(2)} ${xMid.toFixed(2)},${yMid.toFixed(2)}`;
    } else {
      path += ` Q${validos[i - 1].x.toFixed(2)},${validos[i - 1].y.toFixed(2)} ${xMid.toFixed(2)},${yMid.toFixed(2)}`;
    }
  }
  if (validos.length > 1) {
    const last = validos[validos.length - 1];
    const prev = validos[validos.length - 2];
    path += ` Q${prev.x.toFixed(2)},${prev.y.toFixed(2)} ${last.x.toFixed(2)},${last.y.toFixed(2)}`;
  }
  path += ` L${validos[validos.length - 1].x.toFixed(2)},${altura}`;
  path += ` Z`;
  return path;
}

const SERIES_PADRAO: Serie[] = [
  {
    id: "energia",
    rotulo: "Energia (kWh)",
    cor: "#25863c",
    corArea: "rgba(37, 134, 60, 0.12)",
    gradienteId: "grad-energia",
    unidade: "kWh",
    casasDecimais: 4,
    min: 0,
    max: 0,
    visivel: true,
    eixoY: "esquerda",
  },
  {
    id: "co2e",
    rotulo: "CO₂e (g)",
    cor: "#2e63a8",
    corArea: "rgba(46, 99, 168, 0.12)",
    gradienteId: "grad-co2e",
    unidade: "g",
    casasDecimais: 3,
    min: 0,
    max: 0,
    visivel: true,
    eixoY: "direita",
  },
];

export function GraficoLinha({
  pontos,
  series = SERIES_PADRAO,
  altura = 320,
  margens = { topo: 20, direita: 60, fundo: 50, esquerda: 60 },
  vazioTexto = "Nenhum dado de coleta no período selecionado.",
  aoAlternarSerie,
  mostrarEstatisticas = true,
}: Props) {
  // ===== TODOS OS HOOKS NO TOPO =====
  const [hoveredPoint, setHoveredPoint] = useState<PontoProjetado | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [seriesVisiveis, setSeriesVisiveis] = useState<Record<"energia" | "co2e", boolean>>({
    energia: true,
    co2e: true,
  });
  const [larguraContainer, setLarguraContainer] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const legendButtonsRef = useRef<HTMLButtonElement[]>([]);

  const handleAlternarSerie = useCallback(
    (id: "energia" | "co2e") => {
      setSeriesVisiveis((prev) => ({ ...prev, [id]: !prev[id] }));
      aoAlternarSerie?.(id, !seriesVisiveis[id]);
    },
    [aoAlternarSerie, seriesVisiveis]
  );

  // ResizeObserver para medir o container e recalcular largura
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLarguraContainer(entry.contentRect.width);
      }
    });
    ro.observe(container);
    // Valor inicial
    setLarguraContainer(container.clientWidth);
    return () => ro.disconnect();
  }, []);

  const largura = Math.max(300, larguraContainer - margens.esquerda - margens.direita);
  const larguraInterna = largura - margens.esquerda - margens.direita;
  const alturaInterna = altura - margens.topo - margens.fundo;

  // Filtra séries visíveis
  const seriesAtivas = useMemo(() => series.filter((s) => seriesVisiveis[s.id]), [series, seriesVisiveis]);

  // Domínio X (tempo)
  const minX = useMemo(() => (pontos.length > 0 ? dataParaTimestamp(pontos[0].data) : 0), [pontos]);
  const maxX = useMemo(() => (pontos.length > 0 ? dataParaTimestamp(pontos[pontos.length - 1].data) : 0), [pontos]);

  // Configuração dos eixos Y (um por lado)
  const eixosY = useMemo((): { esquerda: EixoYConfig; direita: EixoYConfig } => {
    const seriesPorEixo = {
      esquerda: seriesAtivas.filter((s) => s.eixoY === "esquerda"),
      direita: seriesAtivas.filter((s) => s.eixoY === "direita"),
    };

    const calcularEixo = (seriesDoEixo: Serie[]): EixoYConfig => {
      if (seriesDoEixo.length === 0) {
        return { min: 0, max: 1, ticks: [0, 1], series: [] };
      }
      let minGlobal = Infinity;
      let maxGlobal = -Infinity;
      for (const s of seriesDoEixo) {
        const valores = pontos.map((p) => valorDaSerie(p, s.id)).filter((v): v is number => v !== null);
        if (valores.length > 0) {
          minGlobal = Math.min(minGlobal, Math.min(...valores));
          maxGlobal = Math.max(maxGlobal, Math.max(...valores));
        }
      }
      if (!Number.isFinite(minGlobal) || !Number.isFinite(maxGlobal)) {
        return { min: 0, max: 1, ticks: [0, 1], series: seriesDoEixo };
      }
      const margem = (maxGlobal - minGlobal) * 0.1 || (maxGlobal * 0.1) || 1;
      const min = Math.max(0, minGlobal - margem * 0.5);
      const max = maxGlobal + margem;
      return { min, max, ticks: gerarTicksY(min, max), series: seriesDoEixo };
    };

    return {
      esquerda: calcularEixo(seriesPorEixo.esquerda),
      direita: calcularEixo(seriesPorEixo.direita),
    };
  }, [seriesAtivas, pontos]);

  // Ticks do eixo X
  const ticksX = useMemo(() => gerarTicksX(pontos), [pontos]);

  // Pontos projetados - useMemo em vez de ref (calculado durante render)
  const pontosProjetados = useMemo(() => {
    const resultado: PontoProjetado[] = [];
    for (const s of seriesAtivas) {
      const eixo = s.eixoY === "esquerda" ? eixosY.esquerda : eixosY.direita;
      for (const p of pontos) {
        const valor = valorDaSerie(p, s.id);
        if (valor !== null) {
          resultado.push({
            x: mapearX(dataParaTimestamp(p.data), minX, maxX, larguraInterna) + margens.esquerda,
            y: mapearY(valor, eixo.min, eixo.max, alturaInterna) + margens.topo,
            valor,
            data: p.data,
            serie: s,
            timestamp: dataParaTimestamp(p.data),
          });
        }
      }
    }
    return resultado.sort((a, b) => a.timestamp - b.timestamp);
  }, [seriesAtivas, pontos, minX, maxX, larguraInterna, alturaInterna, margens, eixosY]);

  // Handler de mousemove na área de detecção
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = event.clientX - rect.left;
      const svgWidth = rect.width;
      const scaleX = largura / svgWidth;
      const mouseX = clientX * scaleX;

      let melhorTimestamp: number | null = null;
      let menorDistancia = Infinity;

      for (const p of pontosProjetados) {
        const dist = Math.abs(p.x - mouseX);
        if (dist < menorDistancia) {
          menorDistancia = dist;
          melhorTimestamp = p.timestamp;
        }
      }

      if (melhorTimestamp !== null && menorDistancia <= 30) {
        const pontosNoTimestamp = pontosProjetados.filter((p) => p.timestamp === melhorTimestamp);
        if (pontosNoTimestamp.length > 0) {
          setHoveredPoint(pontosNoTimestamp[0]);
        }
      } else {
        setHoveredPoint(null);
      }
    },
    [largura, pontosProjetados]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // Navegação por teclado para acessibilidade
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (pontosProjetados.length === 0) return;

      // Agrupa pontos por timestamp
      const timestampsUnicos = [...new Set(pontosProjetados.map((p) => p.timestamp))].sort((a, b) => a - b);
      if (timestampsUnicos.length === 0) return;

      let idxAtual = focusedIndex ?? -1;
      if (idxAtual === -1) {
        // Se nada focado, foca no último (mais recente) com ArrowRight/Down
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          setFocusedIndex(timestampsUnicos.length - 1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          setFocusedIndex(0);
        }
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) => (prev === null ? timestampsUnicos.length - 1 : Math.min((prev ?? 0) + 1, timestampsUnicos.length - 1)));
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => (prev === null ? 0 : Math.max((prev ?? 0) - 1, 0)));
          break;
        case "Home":
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          event.preventDefault();
          setFocusedIndex(timestampsUnicos.length - 1);
          break;
        case "Escape":
          event.preventDefault();
          setFocusedIndex(null);
          setHoveredPoint(null);
          break;
      }
    },
    [pontosProjetados, focusedIndex]
  );

  // Sincroniza hoveredPoint com focusedIndex
  useEffect(() => {
    if (focusedIndex !== null) {
      const timestampsUnicos = [...new Set(pontosProjetados.map((p) => p.timestamp))].sort((a, b) => a - b);
      const ts = timestampsUnicos[focusedIndex];
      if (ts !== undefined) {
        const pontosNoTs = pontosProjetados.filter((p) => p.timestamp === ts);
        if (pontosNoTs.length > 0) {
          setHoveredPoint(pontosNoTs[0]);
        }
      }
    }
  }, [focusedIndex, pontosProjetados]);

  // Estatísticas para mostrar abaixo do gráfico
  const estatisticas = useMemo(() => {
    return seriesAtivas.map((s) => {
      const eixo = s.eixoY === "esquerda" ? eixosY.esquerda : eixosY.direita;
      const valores = pontos.map((p) => valorDaSerie(p, s.id)).filter((v): v is number => v !== null);
      if (valores.length === 0) return null;
      const soma = valores.reduce((a, b) => a + b, 0);
      const media = soma / valores.length;
      const min = Math.min(...valores);
      const max = Math.max(...valores);
      const ultimo = valores[valores.length - 1];
      return { serie: s, soma, media, min, max, ultimo, count: valores.length, eixo };
    }).filter(Boolean);
  }, [seriesAtivas, pontos, eixosY]);

  // Coleta todos os pontos no timestamp do hover (todas as séries visíveis)
  const pontosNoHover = useMemo(() => {
    if (!hoveredPoint) return [];
    return pontosProjetados.filter((p) => p.timestamp === hoveredPoint.timestamp);
  }, [hoveredPoint, pontosProjetados]);

  // Se não há pontos, mostra estado vazio (early return DEPOIS dos hooks)
  if (pontos.length === 0) {
    return (
      <div className="grafico-linha" aria-live="polite">
        <div className="grafico-linha-vazio">
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="24" cy="24" r="20" strokeDasharray="8 4" opacity="0.3" />
            <path d="M16 24l6 6 10-12" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
          <p>{vazioTexto}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="grafico-linha"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Gráfico de linha da evolução de energia e CO₂e. Use as setas para navegar entre os pontos de dados."
    >
      {/* Legenda interativa - fora do role="img" para ser acessível */}
      <div className="grafico-linha-legenda" aria-label="Legenda das séries" role="group" aria-labelledby="grafico-legenda-titulo">
        <span id="grafico-legenda-titulo" className="visually-hidden">Séries do gráfico</span>
        {series.map((s, idx) => (
          <button
            key={s.id}
            ref={(el) => { legendButtonsRef.current[idx] = el!; }}
            className={`grafico-linha-legenda-item ${seriesVisiveis[s.id] ? "" : "grafico-linha-legenda-item--oculta"}`}
            style={{ color: s.cor }}
            onClick={() => handleAlternarSerie(s.id)}
            aria-pressed={seriesVisiveis[s.id]}
            data-serie={s.id}
            type="button"
          >
            <span className="grafico-linha-legenda-cor" style={{ background: s.cor }} aria-hidden="true" />
            {s.rotulo}
            <span className="grafico-linha-legenda-toggle" aria-hidden="true">
              {seriesVisiveis[s.id] ? "👁" : "👁‍🗨"}
            </span>
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="grafico-linha-svg"
        viewBox={`0 0 ${largura} ${altura}`}
        width="100%"
        height={altura}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* Gradiente para área da energia */}
          <linearGradient id="grad-energia" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#25863c" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#25863c" stopOpacity="0" />
          </linearGradient>
          {/* Gradiente para área do CO₂e */}
          <linearGradient id="grad-co2e" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2e63a8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2e63a8" stopOpacity="0" />
          </linearGradient>
          {/* Gradiente para halo hover */}
          <linearGradient id="grad-hover" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Área de detecção de hover transparente (cobre toda a área do gráfico) */}
        <rect
          x={margens.esquerda}
          y={margens.topo}
          width={larguraInterna}
          height={alturaInterna}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: "crosshair" }}
        />

        {/* Grid horizontal - usa ticks do eixo esquerdo como referência visual principal */}
        <g className="grafico-linha-grid" stroke="#e8eee9" strokeWidth="1">
          {eixosY.esquerda.ticks.map((valor, i) => {
            const y = mapearY(valor, eixosY.esquerda.min, eixosY.esquerda.max, alturaInterna) + margens.topo;
            return (
              <line key={`grid-y-${i}`} x1={margens.esquerda} y1={y} x2={largura - margens.direita} y2={y} />
            );
          })}
          {/* Grid vertical */}
          {ticksX.map((tick, i) => {
            const x = mapearX(tick.timestamp, minX, maxX, larguraInterna) + margens.esquerda;
            return <line key={`grid-x-${i}`} x1={x} y1={margens.topo} x2={x} y2={altura - margens.fundo} />;
          })}
        </g>

        {/* Eixo Y Esquerda (Energia) */}
        {eixosY.esquerda.series.length > 0 && (
          <g className="grafico-linha-eixo-y grafico-linha-eixo-y--esquerda" fontSize="10" fill="#748078" aria-label="Eixo Y - Energia (kWh)">
            {eixosY.esquerda.ticks.map((valor, i) => {
              const y = mapearY(valor, eixosY.esquerda.min, eixosY.esquerda.max, alturaInterna) + margens.topo;
              const rotulo = formatarValor(valor, eixosY.esquerda.series[0]?.casasDecimais ?? 4);
              return (
                <text key={`eixo-y-esq-${i}`} x={margens.esquerda - 8} y={y + 3} textAnchor="end" dominantBaseline="middle">
                  {rotulo}
                </text>
              );
            })}
            {/* Rótulo do eixo */}
            <text
              x={margens.esquerda - 40}
              y={margens.topo + alturaInterna / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90, ${margens.esquerda - 40}, ${margens.topo + alturaInterna / 2})`}
              fontSize="11"
              fill="#5a645d"
              fontWeight="600"
            >
              Energia (kWh)
            </text>
          </g>
        )}

        {/* Eixo Y Direita (CO₂e) */}
        {eixosY.direita.series.length > 0 && (
          <g className="grafico-linha-eixo-y grafico-linha-eixo-y--direita" fontSize="10" fill="#748078" aria-label="Eixo Y - CO₂e (g)">
            {eixosY.direita.ticks.map((valor, i) => {
              const y = mapearY(valor, eixosY.direita.min, eixosY.direita.max, alturaInterna) + margens.topo;
              const rotulo = formatarValor(valor, eixosY.direita.series[0]?.casasDecimais ?? 3);
              return (
                <text key={`eixo-y-dir-${i}`} x={largura - margens.direita + 8} y={y + 3} textAnchor="start" dominantBaseline="middle">
                  {rotulo}
                </text>
              );
            })}
            {/* Rótulo do eixo */}
            <text
              x={largura - margens.direita + 40}
              y={margens.topo + alturaInterna / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(90, ${largura - margens.direita + 40}, ${margens.topo + alturaInterna / 2})`}
              fontSize="11"
              fill="#5a645d"
              fontWeight="600"
            >
              CO₂e (g)
            </text>
          </g>
        )}

        {/* Eixo X */}
        <g className="grafico-linha-eixo-x" fontSize="10" fill="#748078">
          {ticksX.map((tick, i) => {
            const x = mapearX(tick.timestamp, minX, maxX, larguraInterna) + margens.esquerda;
            return (
              <text key={`eixo-x-${i}`} x={x} y={altura - margens.fundo + 18} textAnchor="middle" dominantBaseline="hanging">
                {tick.rotulo}
              </text>
            );
          })}
        </g>

        {/* Áreas e linhas das séries */}
        <g className="grafico-linha-series">
          {seriesAtivas.map((s) => {
            const eixo = s.eixoY === "esquerda" ? eixosY.esquerda : eixosY.direita;
            const pathArea = gerarPathArea(pontos, s.id, minX, maxX, eixo.min, eixo.max, larguraInterna, alturaInterna);
            const pathLinha = gerarPath(pontos, s.id, minX, maxX, eixo.min, eixo.max, larguraInterna, alturaInterna);
            const pontosValidos = pontos
              .map((p) => ({
                x: mapearX(dataParaTimestamp(p.data), minX, maxX, larguraInterna) + margens.esquerda,
                y: mapearY(valorDaSerie(p, s.id)!, eixo.min, eixo.max, alturaInterna) + margens.topo,
                valor: valorDaSerie(p, s.id),
                data: p.data,
              }))
              .filter((p) => p.valor !== null);

            const isHovered = hoveredPoint?.serie.id === s.id;

            return (
              <g key={s.id} className="grafico-linha-serie">
                {/* Área */}
                {pathArea && (
                  <path
                    d={pathArea}
                    fill={s.id === "energia" ? "url(#grad-energia)" : "url(#grad-co2e)"}
                    stroke="none"
                    className="grafico-linha-area"
                  />
                )}
                {/* Linha */}
                {pathLinha && (
                  <path
                    d={pathLinha}
                    fill="none"
                    stroke={s.cor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="grafico-linha-linha"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))"
                  />
                )}
                {/* Pontos */}
                {pontosValidos.map((p, idx) => {
                  const estaHover = isHovered && hoveredPoint?.data === p.data;
                  return (
                    <g key={`${s.id}-${idx}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={estaHover ? 7 : 4.5}
                        fill={s.cor}
                        stroke="#fff"
                        strokeWidth={estaHover ? 3 : 2}
                        className="grafico-linha-ponto"
                        pointerEvents="none"
                      />
                      {/* Halo no hover/focus */}
                      {estaHover && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={12}
                          fill="url(#grad-hover)"
                          stroke={s.cor}
                          strokeWidth={1.5}
                          className="grafico-linha-ponto-halo"
                          pointerEvents="none"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* Linha vertical de referência no hover/focus */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={margens.topo}
            x2={hoveredPoint.x}
            y2={altura - margens.fundo}
            stroke="#25863c"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity="0.5"
            className="grafico-linha-hover-linha"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Tooltip flutuante - posicionado fora do SVG, no container pai */}
      {hoveredPoint && pontosNoHover.length > 0 && (
        <div
          className="grafico-linha-tooltip"
          style={{
            left: hoveredPoint.x + 16,
            top: hoveredPoint.y - 40,
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className="grafico-linha-tooltip-conteudo">
            <div className="grafico-linha-tooltip-data">
              {new Date(hoveredPoint.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
            {pontosNoHover.map((p) => (
              <div key={p.serie.id} className="grafico-linha-tooltip-serie" style={{ borderLeftColor: p.serie.cor }}>
                <div className="grafico-linha-tooltip-cabecalho" style={{ color: p.serie.cor }}>
                  {p.serie.rotulo}
                </div>
                <div className="grafico-linha-tooltip-valor">
                  {formatarValor(p.valor, p.serie.casasDecimais)} <span>{p.serie.unidade}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grafico-linha-tooltip-seta" />
        </div>
      )}

      {/* Estatísticas abaixo do gráfico */}
      {mostrarEstatisticas && estatisticas.length > 0 && (
        <div className="grafico-linha-estatisticas" aria-label="Estatísticas do período">
          {estatisticas.map((stat) => (
            <div key={stat!.serie.id} className="grafico-linha-stat" style={{ borderColor: stat!.serie.cor }}>
              <span className="grafico-linha-stat-label">{stat!.serie.rotulo}</span>
              <div className="grafico-linha-stat-valores">
                <span className="grafico-linha-stat-item" title="Valor atual">
                  <strong>{formatarValor(stat!.ultimo, stat!.serie.casasDecimais)}</strong>
                  <small>{stat!.serie.unidade}</small>
                </span>
                <span className="grafico-linha-stat-divider" aria-hidden="true">|</span>
                <span className="grafico-linha-stat-item" title="Média do período">
                  <small>Média</small>
                  <strong>{formatarValor(stat!.media, stat!.serie.casasDecimais)}</strong>
                  <small>{stat!.serie.unidade}</small>
                </span>
                <span className="grafico-linha-stat-divider" aria-hidden="true">|</span>
                <span className="grafico-linha-stat-item" title="Total do período">
                  <small>Total</small>
                  <strong>{formatarValor(stat!.soma, stat!.serie.casasDecimais)}</strong>
                  <small>{stat!.serie.unidade}</small>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}