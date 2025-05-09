import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-project', '**/*.test.ts', '**/*.json'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Code quality rules (not formatting)
      // 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 'no-console': ['warn'],
      'prefer-const': ['error'],
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  prettier
)
