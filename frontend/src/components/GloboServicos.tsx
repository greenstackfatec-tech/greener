import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { geoGraticule10, geoOrthographic, geoPath, type GeoSphere } from "d3-geo";
import { feature } from "topojson-client";
import terra from "world-atlas/land-110m.json";
import {
  CENTRO_PADRAO, interpolarCentro, limitarCentro, visivelNoGlobo,
  type CentroDoGlobo, type GrupoNoMapa,
} from "../mapa.ts";
import { situacaoDoServico, type Servico } from "../services/servicos.ts";
import "./GloboServicos.css";

const TAMANHO = 520;
const RAIO = 220;
const MARGEM = TAMANHO / 2;
const DURACAO_ANIMACAO_MS = 700;
/** Graus de giro por pixel arrastado. */
const GRAUS_POR_PIXEL = 0.35;

// Contorno dos continentes (Natural Earth 110m, pacote world-atlas). Carregado uma vez, sem chamada de rede.
type Topologia = Parameters<typeof feature>[0];
const topologia = terra as unknown as Topologia;
const CONTINENTES = feature(topologia, topologia.objects.land);
const GRATICULA = geoGraticule10();
const ESFERA: GeoSphere = { type: "Sphere" };

interface Props {
  grupos: GrupoNoMapa[];
  /** Id do serviço aberto; o globo gira até ele. */
  selecionadoId: number | null;
  aoSelecionar: (servico: Servico) => void;
  /** Ponto de partida do globo. */
  centroInicial?: CentroDoGlobo;
}

function reduzirMovimento(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Texto do pino para leitor de tela e para a dica ao passar o mouse. */
function rotuloDoGrupo(grupo: GrupoNoMapa): string {
  const [primeiro] = grupo.servicos;
  const local = [primeiro.cidade, primeiro.regiao].filter(Boolean).join(", ");
  const nomes = grupo.servicos.map((s) => s.nome).join(", ");
  return grupo.servicos.length === 1
    ? `${primeiro.nome}${local ? `, ${local}` : ""}`
    : `${grupo.servicos.length} serviços${local ? ` em ${local}` : ""}: ${nomes}`;
}

/**
 * Globo 3D estilizado (RF13): esfera em projeção ortográfica desenhada em SVG, com sombreamento
 * e brilho para dar volume. Os pinos são botões (teclado e leitor de tela funcionam) e o globo
 * gira arrastando. Não usa tiles nem API externa; as coordenadas vêm de GET /api/services.
 */
export function GloboServicos({ grupos, selecionadoId, aoSelecionar, centroInicial = CENTRO_PADRAO }: Props) {
  const [centro, setCentro] = useState<CentroDoGlobo>(centroInicial);
  const centroAtual = useRef<CentroDoGlobo>(centroInicial);
  const arraste = useRef<{ x: number; y: number; centro: CentroDoGlobo } | null>(null);

  const aplicarCentro = useCallback((novo: CentroDoGlobo) => {
    centroAtual.current = novo;
    setCentro(novo);
  }, []);

  // Ponto onde o serviço aberto está: o globo gira até lá.
  const alvo = useMemo(() => {
    const grupo = grupos.find((g) => g.servicos.some((s) => s.id === selecionadoId));
    return grupo ? { lat: grupo.latitude, lng: grupo.longitude } : null;
  }, [grupos, selecionadoId]);
  const alvoLat = alvo?.lat;
  const alvoLng = alvo?.lng;

  useEffect(() => {
    if (alvoLat === undefined || alvoLng === undefined) return;
    const destino = { lat: alvoLat, lng: alvoLng };
    const origem = centroAtual.current;
    if (reduzirMovimento()) {
      const quadro = requestAnimationFrame(() => aplicarCentro(destino));
      return () => cancelAnimationFrame(quadro);
    }
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_ANIMACAO_MS);
      const suave = 1 - Math.pow(1 - t, 3); // desacelera no fim
      aplicarCentro(interpolarCentro(origem, destino, suave));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvoLat, alvoLng, aplicarCentro]);

  const { esfera, graticula, continentes, projecao } = useMemo(() => {
    const proj = geoOrthographic()
      .scale(RAIO)
      .translate([MARGEM, MARGEM])
      .clipAngle(90)
      .rotate([-centro.lng, -centro.lat]);
    const caminho = geoPath(proj);
    return {
      projecao: proj,
      esfera: caminho(ESFERA) ?? "",
      graticula: caminho(GRATICULA) ?? "",
      continentes: caminho(CONTINENTES) ?? "",
    };
  }, [centro]);

  const pinos = grupos.flatMap((grupo) => {
    if (!visivelNoGlobo(grupo.latitude, grupo.longitude, centro)) return [];
    const ponto = projecao([grupo.longitude, grupo.latitude]);
    return ponto ? [{ grupo, x: ponto[0], y: ponto[1] }] : [];
  });

  const aoPressionar = (evento: PointerEvent<SVGSVGElement>) => {
    if ((evento.target as Element).closest(".globo-pino")) return; // clique no pino não inicia arraste
    arraste.current = { x: evento.clientX, y: evento.clientY, centro: centroAtual.current };
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  };
  const aoMover = (evento: PointerEvent<SVGSVGElement>) => {
    const base = arraste.current;
    if (!base) return;
    aplicarCentro(limitarCentro({
      lng: base.centro.lng - (evento.clientX - base.x) * GRAUS_POR_PIXEL,
      lat: base.centro.lat + (evento.clientY - base.y) * GRAUS_POR_PIXEL,
    }));
  };
  const aoSoltar = () => { arraste.current = null; };

  const aoTeclar = (evento: KeyboardEvent<SVGGElement>, grupo: GrupoNoMapa) => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      aoSelecionar(grupo.servicos[0]);
    }
  };

  return (
    <svg
      className="globo"
      viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
      role="group"
      aria-label="Globo ilustrativo com os serviços que têm latitude e longitude. Arraste para girar."
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={aoSoltar}
    >
      <defs>
        <radialGradient id="globo-oceano" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#f4fbf5" />
          <stop offset="60%" stopColor="#e3f2e6" />
          <stop offset="100%" stopColor="#b9d9c1" />
        </radialGradient>
        <radialGradient id="globo-brilho" cx="32%" cy="26%" r="45%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="globo-sombra-borda" cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#0f3d22" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f3d22" stopOpacity="0.32" />
        </radialGradient>
      </defs>

      <ellipse className="globo-sombra" cx={MARGEM} cy={MARGEM + RAIO + 24} rx={RAIO * 0.7} ry={14} />
      <circle className="globo-halo" cx={MARGEM} cy={MARGEM} r={RAIO + 14} />
      <path d={esfera} fill="url(#globo-oceano)" />
      <path className="globo-graticula" d={graticula} />
      <path className="globo-terra" d={continentes} />
      <path d={esfera} fill="url(#globo-sombra-borda)" pointerEvents="none" />
      <path d={esfera} fill="url(#globo-brilho)" pointerEvents="none" />
      <path className="globo-borda" d={esfera} />

      {pinos.map(({ grupo, x, y }) => {
        const [primeiro] = grupo.servicos;
        const aberto = grupo.servicos.some((s) => s.id === selecionadoId);
        const situacao = situacaoDoServico(primeiro);
        const rotulo = rotuloDoGrupo(grupo);
        const nome = grupo.servicos.length === 1 ? primeiro.nome : `${primeiro.nome} +${grupo.servicos.length - 1}`;
        return (
          <g
            key={grupo.chave}
            className="globo-pino"
            data-situacao={situacao}
            data-aberto={aberto ? "" : undefined}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            role="button"
            tabIndex={0}
            aria-label={rotulo}
            aria-pressed={aberto}
            onClick={() => aoSelecionar(primeiro)}
            onKeyDown={(evento) => aoTeclar(evento, grupo)}
          >
            <title>{rotulo}</title>
            <circle className="globo-pino-area" r={16} />
            <circle className="globo-pino-onda" r={aberto ? 13 : 9} />
            <circle className="globo-pino-ponto" r={aberto ? 6.5 : 5} />
            {grupo.servicos.length > 1 && <text className="globo-pino-contagem" y={3.5}>{grupo.servicos.length}</text>}
            <text className="globo-pino-nome" x={11} y={-9}>{nome}</text>
            {primeiro.regiao && <text className="globo-pino-regiao" x={11} y={3}>{primeiro.regiao}</text>}
          </g>
        );
      })}
    </svg>
  );
}
