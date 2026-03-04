module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  env: {
    es2022: true,
    node: true,
    browser: true
  },
  settings: {
    react: { version: "detect" }
  },
  ignorePatterns: ["dist", "node_modules"]
};
