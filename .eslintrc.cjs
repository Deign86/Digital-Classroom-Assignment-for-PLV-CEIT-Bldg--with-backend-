module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import', 'jsx-a11y'],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import', 'jsx-a11y', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/no-unresolved': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Remove unused imports automatically
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': ['warn', { 'vars': 'all', 'varsIgnorePattern': '^_', 'args': 'after-used', 'argsIgnorePattern': '^_' }],
    // Let unused-imports handle unused vars; silence TS unused-vars rule
    '@typescript-eslint/no-unused-vars': 'off',
    // Temporarily lower strictness for explicit any — change to warn to reduce noise in bulk passes
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow empty blocks (warn) to reduce noise while we iterate
    'no-empty': ['warn', { 'allowEmptyCatch': true }],
    // Reduce noise for JSX entities in first pass
    'react/no-unescaped-entities': 'off',
  },
};
