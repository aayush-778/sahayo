import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/android/**',
      '**/ios/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // CommonJS files that Node loads directly rather than a bundler: Tailwind
    // presets and the token source they share. `/* eslint-env node */` no
    // longer registers globals under flat config, so they are declared here.
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // The backend's in-memory state is read and written only by its repositories.
    // Their function bodies are the one layer a real database would replace, and a
    // route or socket handler reaching into the maps would be the call site that
    // silently breaks when it does.
    files: ['apps/backend/src/**/*.ts'],
    ignores: ['apps/backend/src/repositories/**', 'apps/backend/src/store/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/store', '**/store/*'],
              importNames: ['state', 'resetState', 'seedState'],
              message: 'Only src/repositories may touch the in-memory state. Call a repository function instead.',
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
