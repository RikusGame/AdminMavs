import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// Flat config real para ESLint 9: NO se usa la clave `extends` (no soportada en
// flat config; el config viejo la usaba y por eso `npm run lint` no ejecutaba).
// En su lugar se registran los plugins y se esparcen las reglas. (Tarjeta [208])
export default [
  // src/ui/** son componentes shadcn/ui vendoreados (con sintaxis TS en .jsx que
  // el parser de ESLint no lee); se ignoran como node_modules. Lo que interesa
  // lintear es el código de la app (pages/modal/components/utils). (Tarjeta [208])
  { ignores: ['dist', 'hostinger-upload', 'node_modules', 'src/ui/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      // no-undef queda como ERROR a propósito: es la regla que habría cazado el
      // botón roto de Conductoras (Tarjeta [300]).
      // Arranque permisivo (punto 5): rules-of-hooks como warning por ahora
      // (hay componentes legacy con hooks tras early-return y nombres en
      // minúscula); subir a error cuando se limpien. no-undef SÍ queda en error
      // (es la que caza bugs reales tipo [300]).
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-prototype-builtins': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Arranque permisivo (Tarjeta [208] punto 5): variables sin usar como
      // warning, no error, para no bloquear al equipo el primer día. Se ignoran
      // las que empiezan con mayúscula/underscore (componentes, constantes).
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
]
