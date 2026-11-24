import { createServer } from "node:http";
import { tratarRequisicao } from "./app.ts";
import { encerrarConexao } from "./db/connection.ts";
import { rotinaColeta } from "./modules/collections/collections.service.ts";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new TypeError("PORT deve ser um número inteiro entre 1 e 65535.");
}

const server = createServer((request, response) => {
  void tratarRequisicao(request, response).catch((erro: unknown) => {
    console.error("Falha ao processar requisição:", erro);
    if (!response.headersSent) {
      response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    }
    response.end(JSON.stringify({ error: "internal_server_error" }));
  });
});

const coletaAutomatica = process.env.COLLECTIONS_AUTO_START ?? "true";
if (coletaAutomatica !== "true" && coletaAutomatica !== "false") {
  throw new TypeError("COLLECTIONS_AUTO_START deve ser true ou false.");
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend GreenER disponível na porta ${port}.`);
  if (coletaAutomatica === "true") rotinaColeta.iniciar();
});

let encerrando = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (encerrando) return;
    encerrando = true;
    const fecharHttp = new Promise<void>((resolve, reject) => {
      server.close((erro) => erro ? reject(erro) : resolve());
    });
    void Promise.allSettled([fecharHttp, rotinaColeta.encerrar()]).then(async (resultados) => {
      for (const resultado of resultados) {
        if (resultado.status === "rejected") {
          console.error("Falha ao encerrar o backend:", resultado.reason);
          process.exitCode = 1;
        }
      }
      await encerrarConexao();
    }).catch((erro: unknown) => {
      console.error("Falha ao encerrar a conexão com o banco:", erro);
      process.exitCode = 1;
    });
  });
}
