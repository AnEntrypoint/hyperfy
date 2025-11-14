import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const packageJson = require('./package.json');

export default [
  // Main ESM bundle
  {
    input: 'src/main.ts',
    output: [
      {
        file: packageJson.main.replace('.js', '.mjs'),
        format: 'es',
        sourcemap: true,
        exports: 'default'
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationDir: null
      }),
      terser({
        format: {
          comments: false
        }
      })
    ],
    external: [
      'ws',
      'eventemitter3',
      'formidable',
      'msgpackr',
      'node-fetch'
    ]
  },

  // CommonJS bundle for compatibility
  {
    input: 'src/main.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'default'
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser()
    ],
    external: [
      'ws',
      'eventemitter3',
      'formidable',
      'msgpackr',
      'node-fetch'
    ]
  },

  // TypeScript declaration file
  {
    input: 'src/main.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: '.',
          paths: { '*': ['*'] }
        }
      })
    ],
    external: [/\.css$/]
  }
];