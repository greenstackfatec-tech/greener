import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { mockServicos } from "./mock-servicos.ts";

// `npm run dev:mock` liga os dados de exemplo do dashboard, sem backend (ver mock-servicos.ts).
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), ...(mode === "mock" ? [mockServicos()] : [])],
    test: {
      include: ["tests/**/*.test.tsx"],
      environment: "jsdom",
      restoreMocks: true,
      unstubGlobals: true,
      globals: true,
      tsconfig: "tsconfig.test.json",
    },
    server: {
      // Em modo mock, não usa proxy (o mock atende /api/*).
      // Em modo normal, proxy para o backend na porta 3000.
      proxy: mode === "mock" ? undefined : {
        "/api": {
          target: "http://localhost:3000",
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
