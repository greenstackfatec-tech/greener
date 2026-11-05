import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { mockServicos } from "./mock-servicos.ts";

// `npm run dev:mock` liga os dados de exemplo do dashboard, sem backend (ver mock-servicos.ts).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "mock" ? [mockServicos()] : [])],
  server: {
    // Mesmo comportamento do Nginx em produção: /api/* vai ao backend sem o prefixo.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
}));
