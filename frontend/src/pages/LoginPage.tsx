import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import { CampoTexto } from "../components/CampoTexto.tsx";
import { LayoutAutenticacao } from "../components/LayoutAutenticacao.tsx";
import { ROTAS } from "../caminhos.ts";
import { ErroApi } from "../services/api.ts";
import { entrar } from "../services/auth.ts";
import "./LoginPage.css";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatarEspera(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Preenchido quando o backend responde 429 (Retry-After): o botão fica bloqueado até zerar.
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const bloqueado = segundosRestantes > 0;

  useEffect(() => {
    if (!bloqueado) return;
    const intervalo = window.setInterval(() => {
      setSegundosRestantes((atual) => Math.max(0, atual - 1));
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [bloqueado]);

  async function aoEnviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando || bloqueado) return;

    const emailLimpo = email.trim();
    const novoErroEmail = REGEX_EMAIL.test(emailLimpo) ? null : "Informe um e-mail válido.";
    const novoErroSenha = senha === "" ? "Informe sua senha." : null;
    setErroEmail(novoErroEmail);
    setErroSenha(novoErroSenha);
    setErroGeral(null);
    if (novoErroEmail || novoErroSenha) return;

    setEnviando(true);
    try {
      await entrar(emailLimpo, senha, lembrar);
      // TODO(DW21/DW05): trocar o destino se a equipe decidir levar o login direto à área administrativa.
      navigate(ROTAS.dashboard);
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 429) {
        setSegundosRestantes(erro.tentarNovamenteEmSegundos ?? 60);
      } else if (erro instanceof ErroApi && (erro.status === 400 || erro.status === 401)) {
        setErroGeral(erro.message); // "E-mail ou senha inválidos."
      } else if (erro instanceof ErroApi) {
        setErroGeral("Não foi possível entrar agora. Tente novamente em instantes.");
      } else {
        setErroGeral("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const alerta = bloqueado
    ? `Muitas tentativas de login. Tente novamente em ${formatarEspera(segundosRestantes)}.`
    : erroGeral;

  return (
    <LayoutAutenticacao>
      <p className="auth-eyebrow">Acesse seu espaço</p>
      <h1 className="auth-titulo">Bem-vindo de volta</h1>
      <p className="auth-subtitulo">Entre para acompanhar a energia e as emissões dos seus softwares.</p>

      <form className="auth-form" onSubmit={aoEnviar} noValidate>
        <CampoTexto
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          maxLength={150}
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          erro={erroEmail}
        />
        <CampoTexto
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          erro={erroSenha}
        />

        {alerta && (
          <p className="login-alerta" role={bloqueado ? undefined : "alert"}>
            {alerta}
          </p>
        )}

        <div className="login-opcoes">
          <label className="login-lembrar">
            <input type="checkbox" checked={lembrar} onChange={(evento) => setLembrar(evento.target.checked)} />
            Lembrar de mim
          </label>
          {/* TODO: sem endpoint de recuperação de senha no backend nem rota no frontend. Ligar quando existirem. */}
          <button
            type="button"
            className="auth-link login-esqueci"
            onClick={() => setErroGeral("A recuperação de senha ainda não está disponível.")}
          >
            Esqueci minha senha
          </button>
        </div>

        <button type="submit" className="auth-botao login-enviar" disabled={enviando || bloqueado}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <hr className="login-divisor" />
      <p className="login-cadastro">
        Ainda não tem conta?<Link to={ROTAS.cadastro}>Criar conta</Link>
      </p>
    </LayoutAutenticacao>
  );
}