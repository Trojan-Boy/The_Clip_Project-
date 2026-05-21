import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,ts,tsx}"],
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
