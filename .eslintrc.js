

module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
  ],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
    ecmaFeatures: {
      modules: true,
    },
  },
  plugins: ["@typescript-eslint"],
  rules: {
    strict: ["error", "global"],
    curly: ["error", "all"],
    eqeqeq: ["error", "always"],
    semi: ["error", "always"],
    "no-unused-vars": "off",
    "prefer-const": "off",
    "@typescript-eslint/no-unused-vars-experimental": "error",
  },
};
