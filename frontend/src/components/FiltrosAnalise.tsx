import { useId } from "react";
import {
  ATALHOS_PERIODO,
  FILTROS_PADRAO,
  erroDoPeriodo,
  paraCampoDataHora,
  type AtalhoPeriodo,
  type FiltrosAnalise as Filtros,
} from "../filtros.ts";
import "./FiltrosAnalise.css";

interface Props {
  filtros: Filtros;
  servicos: readonly { id: number; nome: string }[];
  regioes: readonly string[];
  aoAlterar: (mudanca: Partial<Filtros>) => void;
  aoLimpar: () => void;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Barra de filtros por serviço, região e período (DW14 / RF10, RF11). */
export function FiltrosAnalise({ filtros, servicos, regioes, aoAlterar, aoLimpar }: Props) {
  const idErro = useId();
  const erro = erroDoPeriodo(filtros);
  const alterado = filtros.servicoId !== null || filtros.regiao !== null || filtros.periodo !== FILTROS_PADRAO.periodo;

  const escolherPeriodo = (valor: AtalhoPeriodo) => {
    // Ao abrir o personalizado pela primeira vez, sugere as últimas 24 h.
    if (valor === "personalizado" && !filtros.inicio && !filtros.fim) {
      const agora = Date.now();
      aoAlterar({ periodo: valor, inicio: paraCampoDataHora(new Date(agora - DIA_MS)), fim: paraCampoDataHora(new Date(agora)) });
      return;
    }
    aoAlterar({ periodo: valor });
  };

  return (
    <div className="filtros" role="group" aria-label="Filtros">
      <select
        value={filtros.servicoId ?? ""}
        onChange={(e) => aoAlterar({ servicoId: e.target.value === "" ? null : Number(e.target.value) })}
        aria-label="Filtrar por serviço"
      >
        <option value="">Todos os serviços</option>
        {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select>

      <select value={filtros.regiao ?? ""} onChange={(e) => aoAlterar({ regiao: e.target.value || null })} aria-label="Filtrar por região">
        <option value="">Todas as regiões</option>
        {regioes.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      <select value={filtros.periodo} onChange={(e) => escolherPeriodo(e.target.value as AtalhoPeriodo)} aria-label="Período">
        {ATALHOS_PERIODO.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
      </select>

      {filtros.periodo === "personalizado" && (
        <span className="filtros-intervalo">
          <input
            type="datetime-local"
            value={filtros.inicio}
            max={filtros.fim || undefined}
            onChange={(e) => aoAlterar({ inicio: e.target.value })}
            aria-label="Início do período"
            aria-invalid={erro !== null}
            aria-describedby={erro ? idErro : undefined}
          />
          <span aria-hidden="true">até</span>
          <input
            type="datetime-local"
            value={filtros.fim}
            min={filtros.inicio || undefined}
            onChange={(e) => aoAlterar({ fim: e.target.value })}
            aria-label="Fim do período"
            aria-invalid={erro !== null}
            aria-describedby={erro ? idErro : undefined}
          />
        </span>
      )}

      {alterado && <button type="button" className="filtros-limpar" onClick={aoLimpar}>Limpar filtros</button>}

      {erro && <p id={idErro} className="filtros-erro" role="alert">{erro}</p>}
    </div>
  );
}
