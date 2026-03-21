import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

const sharedLanguageOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
};

export default defineConfig([
  globalIgnores([
    'dist',
    'logs',
    '.agent',
    '.shared',
    'funtexto.db',
    'funtexto.db-shm',
    'funtexto.db-wal',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['api/**/*.js', 'scripts/**/*.js', 'server.js', 'vite.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ...sharedLanguageOptions,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]);
