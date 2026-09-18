import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      /* MapLibre's worker, copied in from node_modules by scripts/copy-maplibre-worker.mjs. Not our code. */
      "public/maplibre/**",
    ],
  },

  /*
   * The service layer is the only door between the UI and the data.
   *
   * A component that reads the Zustand store directly bypasses the seam the real
   * backend swaps into: it becomes the one call site that has to be rewritten,
   * and the one that silently stops updating when something else changes the
   * data. The same goes for reaching past the store into the seed.
   *
   * This is the mechanical half of the rule documented in
   * src/lib/services/index.ts. A comment asks; this fails the build.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/store/**", "src/lib/services/**", "src/lib/seed/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/store", "@/lib/store/*", "**/lib/store", "**/lib/store/*"],
              message:
                "Components must not read or mutate the store. Call a function from @/lib/services instead — that is the seam the backend swaps into.",
            },
            {
              group: ["@/lib/seed", "@/lib/seed/*", "**/lib/seed", "**/lib/seed/*"],
              message:
                "The seed is the store's source, not the UI's. Read data through @/lib/services.",
            },
            {
              /* The seed itself lives in @sahayo/shared. Only its time anchor, which carries no data, is open. */
              regex: "^@sahayo/shared/seed(?!/clock$)",
              message:
                "The seed is the store's source, not the UI's. Read data through @/lib/services; for SEED_NOW use @/lib/dates.",
            },
            {
              group: ["zustand", "zustand/*"],
              message:
                "Only src/lib/store may create or use a zustand store. Read data through @/lib/services.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
