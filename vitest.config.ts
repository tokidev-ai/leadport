import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Emulator round-trips are slower than typical unit tests, especially
    // on a cold-started CI runner.
    testTimeout: 10_000,
    hookTimeout: 20_000,
  },
});
