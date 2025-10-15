import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Base Next.js + TypeScript rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Repo-level tweaks: keep dev flow unblocked while we iteratively type things
  {
    rules: {
      // Too noisy across APIs during refactors; keep as warnings for now
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      // Stylistic nits shouldn't fail CI during active changes
      "prefer-const": "warn",
      // Content pages often contain natural quotes; we'll escape later if needed
      "react/no-unescaped-entities": "off",
      // We'll migrate anchors to <Link> incrementally
      "@next/next/no-html-link-for-pages": "warn",
    },
  },

  // Content pages: allow natural text and anchors while we migrate
  {
    files: ["src/app/[locale]/**"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },

  // Server and API code: anchor rule not relevant, loosen typing noise
  {
    files: ["src/app/api/**", "src/lib/**", "src/services/**"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
