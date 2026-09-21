import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["./vitest.setup.ts"],
    // Tests de auth tocan el store de sesiones/rate-limit (file-backed en local) de forma
    // secuencial a propósito — evita carreras entre tests que comparten IPs/usuarios de prueba.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
