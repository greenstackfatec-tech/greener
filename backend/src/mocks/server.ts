import { createServer } from "node:http";
import { tratarRequisicaoMock } from "./app.ts";

const port = Number(process.env.MOCK_PORT ?? 4010);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new TypeError("MOCK_PORT deve ser um número inteiro entre 1 e 65535.");
}

const host = "127.0.0.1";
const server = createServer(tratarRequisicaoMock);

server.on("error", (erro) => {
  console.error("Não foi possível iniciar os mocks:", erro.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Mocks locais do GreenER em http://${host}:${port}`);
  console.log("Dados fictícios. Consulte docs/mocks.md para selecionar os cenários.");
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    server.closeAllConnections();
  });
}
