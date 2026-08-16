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
      // require() is Metro's static-asset mechanism in React Native
      // (require("../assets/x.png")) and the app also uses lazy requires to
      // break module cycles. Banning it fights the platform.
      '@typescript-eslint/no-require-imports': 'off',
      // Underscore-prefixed bindings are the convention for intentionally
      // unused values (kept destructure slots, documented dead params).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
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
    // The verification scripts are CommonJS node programs, not app modules.
    // Linting them as ESM browser code produced thousands of phantom no-undef
    // and no-require-imports errors that buried every real finding.
    files: [
      'scripts/**/*.{cjs,js}',
      'scripts/**/*.ts',
      '*.cjs',
      'app.config.js',
      'metro.config.js',
      'babel.config.js',
      'eslint.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
        exports: 'writable',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        fetch: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-restricted-imports': 'off',
    },
  },

  {
    // Without the scratch directories here, `lint:all` reported ~91k problems,
    // almost all of them from checked-out worktrees and agent scratch space.
    // Real source accounts for barely a hundred.
    ignores: [
      'node_modules/**',
      // The dashboard workspace lints itself (apps/dashboard/eslint.config.mjs)
      // and ships generated files (cloudflare-env.d.ts, .open-next) that the
      // root config must not sweep.
      'apps/**',
      '.expo/**',
      'dist/**',
      'dist-web/**',
      'build/**',
      '.worktrees/**',
      '.claude/**',
      '.agents/**',
      '.codex/**',
      'tmp/**',
      'tmp-*/**',
      'android/**',
      'ios/**',
    ],
  },
];