import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link } from "react-router";
import { CampoTexto } from "../components/CampoTexto.tsx";
import { LayoutAutenticacao } from "../components/LayoutAutenticacao.tsx";
import { ROTAS } from "../caminhos.ts";
import { ErroApi } from "../services/api.ts";
import { CODIGO_DOCUMENTO_DUPLICADO, cadastrar } from "../services/cadastro.ts";
import type { TipoPessoa } from "../services/cadastro.ts";
import {
  LIMITE_EMAIL,
  LIMITE_NOME,
  somenteDigitos,
  validarCnpj,
  validarCpf,
  validarEmail,
  validarNomeCompleto,
  validarNovaSenha,
  validarRazaoSocial,
} from "../utils/validacao.ts";
import "./CadastroPage.css";

type Campo = "nome" | "documento" | "email" | "senha";
type Valores = Record<Campo, string>;
type Erros = Partial<Record<Campo, string>>;

const CAMPOS: Campo[] = ["nome", "documento", "email", "senha"];
const VALORES_VAZIOS: Valores = { nome: "", documento: "", email: "", senha: "" };

/** Tudo que muda entre "Pessoa física" e "Pessoa jurídica" fica aqui, conforme o Figma. */
const TEXTOS = {
  fisica: {
    titulo: "Crie sua conta",
    subtitulo: "Dê o primeiro passo para acompanhar o impacto dos seus softwares.",
    rotuloNome: "Nome completo",
    placeholderNome: "Digite seu nome completo",
    rotuloDocumento: "CPF",
    placeholderDocumento: "Digite seu CPF",
    tamanhoDocumento: 11,
    rotuloEmail: "E-mail",
    placeholderEmail: "Digite seu e-mail",
    autoCompleteNome: "name",
    mensagemDocumentoDuplicado: "Este CPF já está cadastrado.",
  },
  juridica: {
    titulo: "Crie a conta da sua empresa",
    subtitulo: "Cadastre sua empresa para acompanhar o impacto dos seus softwares.",
    rotuloNome: "Razão social",
    placeholderNome: "Digite a razão social",
    rotuloDocumento: "CNPJ",
    placeholderDocumento: "Digite seu CNPJ",
    tamanhoDocumento: 14,
    rotuloEmail: "E-mail corporativo",
    placeholderEmail: "Digite seu e-mail corporativo",
    autoCompleteNome: "organization",
    mensagemDocumentoDuplicado: "Este CNPJ já está cadastrado.",
  },
} as const;

function validarCampo(campo: Campo, valor: string, tipo: TipoPessoa): string | null {
  switch (campo) {
    case "nome":
      return tipo === "fisica" ? validarNomeCompleto(valor) : validarRazaoSocial(valor);
    case "documento":
      return tipo === "fisica" ? validarCpf(valor) : validarCnpj(valor);
    case "email":
      return validarEmail(valor, tipo === "fisica" ? "Informe seu e-mail." : "Informe o e-mail corporativo.");
    case "senha":
      return validarNovaSenha(valor);
  }
}

export function CadastroPage() {
  const [tipo, setTipo] = useState<TipoPessoa>("fisica");
  const [valores, setValores] = useState<Valores>(VALORES_VAZIOS);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const textos = TEXTOS[tipo];

  function definirErro(campo: Campo, mensagem: string | null) {
    setErros((atual) => {
      const proximo = { ...atual };
      if (mensagem) proximo[campo] = mensagem;
      else delete proximo[campo];
      return proximo;
    });
  }

  function trocarTipo(novoTipo: TipoPessoa) {
    if (novoTipo === tipo || enviando) return;
    setTipo(novoTipo);
    // Nome e documento têm outro significado em cada tipo; e-mail e senha são mantidos.
    setValores((atual) => ({ ...atual, nome: "", documento: "" }));
    setErros({});
    setErroGeral(null);
  }

  function aoAlterar(campo: Campo, texto: string) {
    const valor = campo === "documento" ? somenteDigitos(texto) : texto;
    setValores((atual) => ({ ...atual, [campo]: valor }));
    // Se o campo já estava com erro, revalida enquanto a pessoa corrige.
    if (erros[campo]) definirErro(campo, validarCampo(campo, valor, tipo));
  }

  function aoSairDoCampo(campo: Campo) {
    // Campo vazio só é cobrado ao enviar, para não "brigar" com quem está só passando por ele.
    if (valores[campo] !== "") definirErro(campo, validarCampo(campo, valores[campo], tipo));
  }

  function tratarErroDoBackend(erro: unknown) {
    if (erro instanceof ErroApi && erro.status === 409) {
      if (erro.codigo === CODIGO_DOCUMENTO_DUPLICADO) {
        definirErro("documento", textos.mensagemDocumentoDuplicado);
      } else {
        definirErro("email", "Este e-mail já está cadastrado.");
      }
    } else if (erro instanceof ErroApi && (erro.status === 400 || erro.status === 422)) {
      setErroGeral(erro.message);
    } else if (erro instanceof ErroApi && (erro.status === 404 || erro.status === 405 || erro.status === 501)) {
      // TODO(backend): remover este ramo quando POST /auth/register existir.
      setErroGeral("O cadastro ainda não está disponível no servidor. Tente novamente mais tarde.");
    } else if (erro instanceof ErroApi) {
      setErroGeral("Não foi possível criar a conta agora. Tente novamente em instantes.");
    } else {
      setErroGeral("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    }
  }

  async function aoEnviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const novosErros: Erros = {};
    for (const campo of CAMPOS) {
      const mensagem = validarCampo(campo, valores[campo], tipo);
      if (mensagem) novosErros[campo] = mensagem;
    }
    setErros(novosErros);
    setErroGeral(null);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await cadastrar({
        tipoPessoa: tipo,
        nome: valores.nome.trim(),
        documento: valores.documento,
        email: valores.email.trim(),
        senha: valores.senha,
      });
      setConcluido(true);
    } catch (erro) {
      tratarErroDoBackend(erro);
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    // Estado de sucesso não existe no Figma. TODO(design): confirmar o visual com a equipe (DD07).
    return (
      <LayoutAutenticacao>
        <p className="auth-eyebrow">Tudo certo</p>
        <h1 className="auth-titulo">Conta criada</h1>
        <p className="auth-subtitulo">Agora é só entrar com o seu e-mail e a senha que você acabou de criar.</p>
        <Link className="auth-botao cadastro-ir-login" to={ROTAS.login}>
          Ir para o login
        </Link>
      </LayoutAutenticacao>
    );
  }

  return (
    <LayoutAutenticacao>
      {/* O Figma escreve "FREENER" neste texto; usamos "GreenER", o nome do produto. Confirmar com o design. */}
      <p className="auth-eyebrow">Comece com o GreenER</p>
      <h1 className="auth-titulo">{textos.titulo}</h1>
      <p className="auth-subtitulo">{textos.subtitulo}</p>

      <div className="cadastro-tipos" role="group" aria-label="Tipo de cadastro">
        <button
          type="button"
          className="cadastro-tipo"
          aria-pressed={tipo === "fisica"}
          onClick={() => trocarTipo("fisica")}
        >
          Pessoa física
        </button>
        <button
          type="button"
          className="cadastro-tipo"
          aria-pressed={tipo === "juridica"}
          onClick={() => trocarTipo("juridica")}
        >
          Pessoa jurídica
        </button>
      </div>

      <form className="auth-form cadastro-form" onSubmit={aoEnviar} noValidate>
        <CampoTexto
          rotulo={textos.rotuloNome}
          type="text"
          autoComplete={textos.autoCompleteNome}
          maxLength={LIMITE_NOME}
          placeholder={textos.placeholderNome}
          value={valores.nome}
          onChange={(evento) => aoAlterar("nome", evento.target.value)}
          onBlur={() => aoSairDoCampo("nome")}
          erro={erros.nome}
        />
        <CampoTexto
          rotulo={textos.rotuloDocumento}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={textos.tamanhoDocumento}
          placeholder={textos.placeholderDocumento}
          ajuda="Somente números."
          value={valores.documento}
          onChange={(evento) => aoAlterar("documento", evento.target.value)}
          onBlur={() => aoSairDoCampo("documento")}
          erro={erros.documento}
        />
        <CampoTexto
          rotulo={textos.rotuloEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={LIMITE_EMAIL}
          placeholder={textos.placeholderEmail}
          ajuda="Você usará este e-mail para entrar."
          value={valores.email}
          onChange={(evento) => aoAlterar("email", evento.target.value)}
          onBlur={() => aoSairDoCampo("email")}
          erro={erros.email}
        />
        <CampoTexto
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="Crie uma senha"
          ajuda="Use ao menos 8 caracteres."
          value={valores.senha}
          onChange={(evento) => aoAlterar("senha", evento.target.value)}
          onBlur={() => aoSairDoCampo("senha")}
          erro={erros.senha}
        />

        {erroGeral && (
          <p className="cadastro-alerta" role="alert">
            {erroGeral}
          </p>
        )}

        <button type="submit" className="auth-botao cadastro-enviar" disabled={enviando}>
          {enviando ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <hr className="cadastro-divisor" />
      <p className="cadastro-login">
        Já tem uma conta?<Link to={ROTAS.login}>Entrar</Link>
      </p>
    </LayoutAutenticacao>
  );
}