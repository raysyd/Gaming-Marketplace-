import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/load-env.ts"],
    // Integration tests hit a real Postgres and deliberately race
    // concurrent requests against it — do not parallelise test files, or
    // two suites' "last unit" races could interfere with each other.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
