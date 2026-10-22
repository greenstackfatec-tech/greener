import { createServer } from "node:http";
import { tratarRequisicao } from "./app.ts";
import { encerrarConexao } from "./db/connection.ts";

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

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend GreenER disponível na porta ${port}.`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close((erro) => {
      if (erro) {
        console.error("Falha ao encerrar o servidor HTTP:", erro);
        process.exitCode = 1;
      }
      void encerrarConexao().catch((erroConexao: unknown) => {
        console.error("Falha ao encerrar a conexão com o banco:", erroConexao);
        process.exitCode = 1;
      });
    });
  });
}