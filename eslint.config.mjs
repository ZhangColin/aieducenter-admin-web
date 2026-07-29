import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// ESLint 10 仅支持 flat config；eslint-config-next@16 已导出 flat 配置数组。
// （原 .eslintrc.json + `next lint` 组合在 ESLint 10 下报 "Invalid Options" 已弃用。）
/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "postcss.config.mjs",
    ],
  },
  ...nextCoreWebVitals,
];

export default config;
