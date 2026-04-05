const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '../*',
            '../../*',
            '../../../*',
            '../../../../*',
          ],
        },
      ],
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },

  {
    files: ['babel.config.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
    ],
  },
];