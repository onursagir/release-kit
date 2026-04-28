import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@release-kit\/core\/(.+)$/,
        replacement: `${resolve(import.meta.dirname, "packages/core/src")}/$1.ts`,
      },
    ],
  },
});
