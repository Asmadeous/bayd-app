import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The per-app Capacitor projects. "build/**" above is anchored to this
    // directory, so it misses these: Xcode derived data (which also carries
    // vendored SPM checkouts) and the minified web bundle `cap sync` copies in
    // from out/. Linting either reports thousands of problems in generated or
    // third-party code and buries anything real.
    "ios*/build/**",
    "android*/build/**",
    "ios*/App/App/public/**",
    "android*/app/src/main/assets/public/**",
  ]),
]);

export default eslintConfig;
