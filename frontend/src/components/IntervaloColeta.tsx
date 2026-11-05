import { useEffect, useId, useState } from "react";
import type { SubmitEvent } from "react";
import { ErroApi } from "../services/api.ts";
import {
  INTERVALO_MAX_SEGUNDOS,
  INTERVALO_MIN_SEGUNDOS,
  buscarIntervaloColeta,
  salvarIntervaloColeta,
} from "../services/configuracao.ts";

type Carga =
  | { situacao: "carregando" }
  | { situacao: "erro"; mensagem: string }
  | { situacao: "pronto"; salvo: number };

type Aviso = { tipo: "sucesso" | "erro"; texto: string } | null;

/** Descreve o intervalo de forma legível: 90 -> "1 min 30 s". */
function descrever(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  return [horas ? `${horas} h` : "", minutos ? `${minutos} min` : "", resto ? `${resto} s` : ""].filter(Boolean).join(" ");
}

/** Devolve a mensagem de erro do campo, ou `null` se o texto digitado for um intervalo válido. */
function validar(texto: string): string | null {
  if (!/^\d+$/.test(texto.trim())) return "Digite um número inteiro de segundos.";
  const valor = Number(texto);
  if (valor < INTERVALO_MIN_SEGUNDOS || valor > INTERVALO_MAX_SEGUNDOS) {
    return `Use um valor entre ${INTERVALO_MIN_SEGUNDOS} e ${INTERVALO_MAX_SEGUNDOS} segundos.`;
  }
  return null;
}

interface IntervaloColetaProps {
  /** Chamado quando o backend responde 401 (token expirado ou inválido). */
  aoSessaoExpirada: () => void;
}

/** Card que mostra e altera o intervalo entre as coletas de métricas (GET e PUT /monitoring-settings). */
export function IntervaloColeta({ aoSessaoExpirada }: IntervaloColetaProps) {
  const idCampo = useId();
  const [carga, setCarga] = useState<Carga>({ situacao: "carregando" });
  const [texto, setTexto] = useState("");
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [salvando, setSalvando] = useState(false);
  // Aumenta a cada "Tentar novamente" para refazer a leitura.
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    buscarIntervaloColeta(controle.signal)
      .then((segundos) => {
        setCarga({ situacao: "pronto", salvo: segundos });
        setTexto(String(segundos));
      })
      .catch((erro: unknown) => {
        if (controle.signal.aborted) return;
        if (erro instanceof ErroApi && erro.status === 401) {
          aoSessaoExpirada();
          return;
        }
        setCarga({ situacao: "erro", mensagem: "Não foi possível carregar o intervalo de coleta." });
      });
    return () => controle.abort();
  }, [tentativa, aoSessaoExpirada]);

  function tentarNovamente() {
    setCarga({ situacao: "carregando" });
    setTentativa((atual) => atual + 1);
  }

  async function aoEnviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando || carga.situacao !== "pronto") return;

    const mensagem = validar(texto);
    setErroCampo(mensagem);
    setAviso(null);
    if (mensagem) return;

    const segundos = Number(texto);
    setSalvando(true);
    try {
      await salvarIntervaloColeta(segundos);
      setCarga({ situacao: "pronto", salvo: segundos });
      setAviso({ tipo: "sucesso", texto: `Intervalo atualizado para ${descrever(segundos)}.` });
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) {
        aoSessaoExpirada();
        return;
      }
      if (erro instanceof ErroApi && (erro.status === 404 || erro.status === 405)) {
        // TODO(TP19): remover este caso quando o backend tiver o endpoint de alteração.
        setAviso({ tipo: "erro", texto: "O servidor ainda não permite alterar o intervalo (endpoint da TP19 pendente)." });
      } else if (erro instanceof ErroApi && erro.status === 400) {
        setAviso({ tipo: "erro", texto: erro.message });
      } else if (erro instanceof ErroApi) {
        setAviso({ tipo: "erro", texto: "Não foi possível salvar agora. Tente novamente em instantes." });
      } else {
        setAviso({ tipo: "erro", texto: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." });
      }
    } finally {
      setSalvando(false);
    }
  }

  const alterado = carga.situacao === "pronto" && texto.trim() !== String(carga.salvo);

  return (
    <section className="adm-card adm-intervalo" aria-labelledby="intervalo-titulo">
      <h2 id="intervalo-titulo" className="adm-card-titulo">Intervalo de coleta</h2>
      <p className="adm-card-legenda">Tempo entre uma coleta de métricas e a próxima.</p>

      {carga.situacao === "carregando" && <p className="adm-intervalo-estado" role="status">Carregando configuração...</p>}

      {carga.situacao === "erro" && (
        <div className="adm-aviso" data-tipo="erro" role="alert">
          <span>{carga.mensagem}</span>
          <button type="button" className="adm-link" onClick={tentarNovamente}>Tentar novamente</button>
        </div>
      )}

      {carga.situacao === "pronto" && (
        <form className="adm-intervalo-form" onSubmit={aoEnviar} noValidate>
          <div className="adm-campo">
            <label htmlFor={idCampo}>Intervalo (segundos)</label>
            <input
              id={idCampo}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              aria-invalid={erroCampo ? true : undefined}
              aria-describedby={`${idCampo}-ajuda`}
              disabled={salvando}
            />
            <p id={`${idCampo}-ajuda`} className="adm-campo-ajuda" data-erro={erroCampo ? "" : undefined}>
              {erroCampo ?? `Atual: ${descrever(carga.salvo)}. Mínimo de ${INTERVALO_MIN_SEGUNDOS} segundos.`}
            </p>
          </div>

          <button type="submit" className="adm-botao" disabled={salvando || !alterado}>
            {salvando ? "Salvando..." : "Salvar intervalo"}
          </button>
        </form>
      )}

      {aviso && (
        <p className="adm-aviso" data-tipo={aviso.tipo} role={aviso.tipo === "erro" ? "alert" : "status"}>
          {aviso.texto}
        </p>
      )}
    </section>
  );
}
