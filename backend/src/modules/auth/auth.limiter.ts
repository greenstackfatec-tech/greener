import { ErroHttp } from "./auth.http.ts";

const MAX_TENTATIVAS = 5;
const JANELA_MS = 5 * 60 * 1000;
const MAX_EMAILS = 10_000;

interface JanelaLogin {
  tentativas: number;
  expiraEm: number;
}

export class ErroLimiteLogin extends ErroHttp {
  readonly tentarNovamenteEmSegundos: number;

  constructor(esperaMs: number) {
    super(429, "too_many_requests", "Muitas tentativas de login. Aguarde antes de tentar novamente.");
    this.tentarNovamenteEmSegundos = Math.max(1, Math.ceil(esperaMs / 1000));
  }
}

/** Contadores por e-mail, mantidos apenas na memória deste processo. */
export class LimitadorLogin {
  private readonly janelas = new Map<string, JanelaLogin>();
  private readonly relogio: () => number;

  constructor(relogio: () => number = () => performance.now()) {
    this.relogio = relogio;
  }

  iniciarTentativa(email: string): (resultado: "sucesso" | "falha" | "erro") => void {
    const agora = this.relogio();
    // A ordem de criação também é a de expiração; basta remover as primeiras janelas vencidas.
    for (const [chave, janela] of this.janelas) {
      if (janela.expiraEm > agora) break;
      this.janelas.delete(chave);
    }

    let janela = this.janelas.get(email);
    if (!janela) {
      const maisAntiga = this.janelas.values().next().value;
      // Não descartar um bloqueio ativo para abrir espaço a um e-mail arbitrário.
      if (this.janelas.size >= MAX_EMAILS && maisAntiga) {
        throw new ErroLimiteLogin(maisAntiga.expiraEm - agora);
      }
      janela = { tentativas: 0, expiraEm: agora + JANELA_MS };
      this.janelas.set(email, janela);
    }
    if (janela.tentativas >= MAX_TENTATIVAS) {
      throw new ErroLimiteLogin(janela.expiraEm - agora);
    }

    // Reservar antes de consultar o banco evita ultrapassar a cota em paralelo.
    janela.tentativas += 1;
    let concluida = false;
    return (resultado) => {
      if (concluida) return;
      concluida = true;
      if (this.janelas.get(email) !== janela) return;
      if (resultado === "sucesso") {
        this.janelas.delete(email);
      } else if (resultado === "erro") {
        janela.tentativas -= 1;
        if (janela.tentativas === 0) this.janelas.delete(email);
      }
    };
  }
}
