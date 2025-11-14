import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';

export default [
  // Main ESM bundle
  {
    input: 'src/main.ts',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist'
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
  }
];