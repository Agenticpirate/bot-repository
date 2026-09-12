import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': 'warn',
    },
    settings: {
      react: {
        // Apps use React 19; the collection root has no React dependency.
        version: '19.0',
      },
    },
  },
  // Node.js scripts
  {
    files: ['**/scripts/**/*.js', '**/scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      'out/**',
      '**/out/**',
      'dist/**',
      '**/dist/**',
      'dist-mobile/**',
      '**/dist-mobile/**',
      'coverage/**',
      '**/coverage/**',
      '*.config.cjs',
      '**/*.config.cjs',
      '*.config.mjs',
    ],
  },
)
