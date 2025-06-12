import js from '@eslint/js';
import promise from 'eslint-plugin-promise';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      promise,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...promise.configs.recommended.rules,
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-async-promise-executor': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: false }],
      'require-atomic-updates': 'warn',
      'promise/catch-or-return': 'warn',
      'promise/always-return': 'warn',
    },
  },
]; 