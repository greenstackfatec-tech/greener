import { useCallback, useRef, useState } from "react";
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
function gerarPath(pontos: PontoGrafico[], serieId: "energia" | "co2e", minX: number, maxX: number, minY: number, maxY: number, largura: number, altura: number): string {
  const validos = pontos
    .map((p) => ({ x: mapearX(dataParaTimestamp(p.data), minX, maxX, largura), y: mapearY(valorDaSerie(p, serieId)!, minY, maxY, altura), valor: valorDaSerie(p, serieId) }))
    .filter((p) => p.valor !== null);

  if (validos.length < 2) return "";

  // Curva suave usando quadratic Bézier
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
  // Último segmento (para suavizar a curva até o final)
  if (validos.length > 1) {
    const last = validos[validos.length - 1];
    const prev = validos[validos.length - 2];
    path += ` Q${prev.x.toFixed(2)},${prev.y.toFixed(2)} ${last.x.toFixed(2)},${last.y.toFixed(2)}`;
  }
  return path;
}

/** Gera path SVG para área sob a linha. */
function gerarPathArea(pontos: PontoGrafico[], serieId: "energia" | "co2e", minX: number, maxX: number, minY: number, maxY: number, largura: number, altura: number): string {
  const validos = pontos
    .map((p) => ({ x: mapearX(dataParaTimestamp(p.data), minX, maxX, largura), y: mapearY(valorDaSerie(p, serieId)!, minY, maxY, altura), valor: valorDaSerie(p, serieId) }))
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
  },
];

export function GraficoLinha({
  pontos,
  series = SERIES_PADRAO,
  altura = 320,
  margens = { topo: 20, direita: 30, fundo: 50, esquerda: 60 },
  vazioTexto = "Nenhum dado de coleta no período selecionado.",
  aoAlternarSerie,
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; serie: Serie; valor: number; data: string } | null>(null);
  const [seriesVisiveis, setSeriesVisiveis] = useState<Record<"energia" | "co2e", boolean>>({
    energia: true,
    co2e: true,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleAlternarSerie = useCallback((id: "energia" | "co2e") => {
    setSeriesVisiveis((prev) => ({ ...prev, [id]: !prev[id] }));
    aoAlternarSerie?.(id, !seriesVisiveis[id]);
  }, [aoAlternarSerie, seriesVisiveis]);

  // Filtra séries visíveis
  const seriesAtivas = series.filter((s) => seriesVisiveis[s.id]);

  // Se não há pontos, mostra estado vazio
  if (pontos.length === 0) {
    return (
      <div className="grafico-linha" role="img" aria-label={vazioTexto}>
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

  // Calcula min/max globais para as séries que têm dados
  const seriesComDados = seriesAtivas.map((s) => {
    const valores = pontos.map((p) => valorDaSerie(p, s.id)).filter((v): v is number => v !== null);
    const min = valores.length > 0 ? Math.min(...valores) : 0;
    const max = valores.length > 0 ? Math.max(...valores) : 0;
    const margem = (max - min) * 0.1 || (max * 0.1) || 1;
    return { ...s, min: Math.max(0, min - margem * 0.5), max: max + margem };
  });

  // Domínio X (tempo)
  const minX = dataParaTimestamp(pontos[0].data);
  const maxX = dataParaTimestamp(pontos[pontos.length - 1].data);

  // Domínio Y (valor) - usa o maior max entre as séries
  const minY = Math.min(...seriesComDados.map((s) => s.min));
  const maxY = Math.max(...seriesComDados.map((s) => s.max));

  const larguraTotal = typeof window !== "undefined" ? window.innerWidth : 800;
  const largura = Math.max(300, larguraTotal - margens.esquerda - margens.direita - 40);
  const alturaInterna = altura - margens.topo - margens.fundo;
  const larguraInterna = largura - margens.esquerda - margens.direita;

  const ticksX = gerarTicksX(pontos);
  const ticksY = gerarTicksY(minY, maxY);

  // Estatísticas para mostrar abaixo do gráfico
  const estatisticas = seriesComDados.map((s) => {
    const valores = pontos.map((p) => valorDaSerie(p, s.id)).filter((v): v is number => v !== null);
    if (valores.length === 0) return null;
    const soma = valores.reduce((a, b) => a + b, 0);
    const media = soma / valores.length;
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const ultimo = valores[valores.length - 1];
    return { serie: s, soma, media, min, max, ultimo, count: valores.length };
  }).filter(Boolean);

  return (
    <div className="grafico-linha" role="img" aria-label="Gráfico de linha da evolução de energia e CO₂e">
      {/* Legenda interativa */}
      <div className="grafico-linha-legenda" aria-label="Legenda das séries">
        {series.map((s) => (
          <button
            key={s.id}
            className={`grafico-linha-legenda-item ${seriesVisiveis[s.id] ? "" : "grafico-linha-legenda-item--oculta"}`}
            style={{ color: s.cor }}
            onClick={() => handleAlternarSerie(s.id)}
            aria-pressed={seriesVisiveis[s.id]}
            data-serie={s.id}
            type="button"
          >
            <span className="grafico-linha-legenda-cor" style={{ background: s.cor }} />
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
        onMouseLeave={() => setHoveredPoint(null)}
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
          {/* Gradiente para linha hover */}
          <linearGradient id="grad-hover" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        <g className="grafico-linha-grid" stroke="#e8eee9" strokeWidth="1">
          {ticksY.map((valor, i) => {
            const y = mapearY(valor, minY, maxY, alturaInterna) + margens.topo;
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

        {/* Eixo Y */}
        <g className="grafico-linha-eixo-y" fontSize="10" fill="#748078">
          {ticksY.map((valor, i) => {
            const y = mapearY(valor, minY, maxY, alturaInterna) + margens.topo;
            const serieRef = seriesComDados.find((s) => valor >= s.min && valor <= s.max) || seriesComDados[0];
            const rotulo = formatarValor(valor, serieRef.casasDecimais);
            return (
              <text key={`eixo-y-${i}`} x={margens.esquerda - 8} y={y + 3} textAnchor="end" dominantBaseline="middle">
                {rotulo}
              </text>
            );
          })}
        </g>

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
          {seriesComDados.map((s) => {
            const pathArea = gerarPathArea(pontos, s.id, minX, maxX, minY, maxY, larguraInterna, alturaInterna);
            const pathLinha = gerarPath(pontos, s.id, minX, maxX, minY, maxY, larguraInterna, alturaInterna);
            const pontosValidos = pontos
              .map((p) => ({
                x: mapearX(dataParaTimestamp(p.data), minX, maxX, larguraInterna) + margens.esquerda,
                y: mapearY(valorDaSerie(p, s.id)!, minY, maxY, alturaInterna) + margens.topo,
                valor: valorDaSerie(p, s.id),
                data: p.data,
              }))
              .filter((p) => p.valor !== null);

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
                {pontosValidos.map((p, idx) => (
                  <g key={`${s.id}-${idx}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={4.5}
                      fill={s.cor}
                      stroke="#fff"
                      strokeWidth={2}
                      className="grafico-linha-ponto"
                      data-valor={formatarValor(p.valor, s.casasDecimais)}
                      data-data={p.data}
                      data-serie={s.rotulo}
                      onMouseEnter={() => {
                        const rect = svgRef.current?.getBoundingClientRect();
                        if (rect) {
                          setHoveredPoint({
                            x: p.x,
                            y: p.y,
                            serie: s,
                            valor: p.valor!,
                            data: p.data,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredPoint(null)}
                      tabIndex={0}
                      role="img"
                      aria-label={`${s.rotulo}: ${formatarValor(p.valor, s.casasDecimais)} ${s.unidade} em ${new Date(p.data).toLocaleString("pt-BR")}`}
                    />
                    {/* Halo no hover */}
                    {hoveredPoint?.data === p.data && hoveredPoint?.serie.id === s.id && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={10}
                        fill="url(#grad-hover)"
                        stroke={s.cor}
                        strokeWidth={1.5}
                        className="grafico-linha-ponto-halo"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </g>

        {/* Linha vertical de referência no hover */}
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

      {/* Tooltip flutuante */}
      {hoveredPoint && (
        <div
          ref={tooltipRef}
          className="grafico-linha-tooltip"
          style={{
            left: hoveredPoint.x + margens.esquerda + 16,
            top: hoveredPoint.y + margens.topo - 40,
          }}
          role="tooltip"
          aria-label={`${hoveredPoint.serie.rotulo}: ${formatarValor(hoveredPoint.valor, hoveredPoint.serie.casasDecimais)} ${hoveredPoint.serie.unidade}`}
        >
          <div className="grafico-linha-tooltip-conteudo" style={{ borderColor: hoveredPoint.serie.cor }}>
            <div className="grafico-linha-tooltip-cabecalho" style={{ color: hoveredPoint.serie.cor }}>
              {hoveredPoint.serie.rotulo}
            </div>
            <div className="grafico-linha-tooltip-valor">
              {formatarValor(hoveredPoint.valor, hoveredPoint.serie.casasDecimais)} <span>{hoveredPoint.serie.unidade}</span>
            </div>
            <div className="grafico-linha-tooltip-data">
              {new Date(hoveredPoint.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>
          <div className="grafico-linha-tooltip-seta" style={{ borderTopColor: hoveredPoint.serie.cor }} />
        </div>
      )}

      {/* Estatísticas abaixo do gráfico */}
      {estatisticas.length > 0 && (
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