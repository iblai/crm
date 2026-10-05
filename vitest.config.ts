import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // The pure modules the unit tests own; components and the API slice are exercised by e2e.
      include: [
        "lib/crm/activities.ts",
        "lib/crm/errors.ts",
        "lib/crm/format.ts",
        "lib/crm/permissions.ts",
        "lib/crm/views.ts",
        "lib/iblai/tenant.ts",
        "lib/locale-cookie.ts",
        "i18n/config.ts",
      ],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 70 },
      reporter: ["text-summary"],
    },
  },
});
