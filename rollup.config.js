import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default [
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/cjs/index.js',
            format: 'cjs',
            sourcemap: true
        },
        plugins: [
            resolve(),
            commonjs(),
            typescript({tsconfig: './tsconfig.json'})
        ]
    },
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/esm/index.js',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            resolve(),
            commonjs(),
            typescript({tsconfig: './tsconfig.json'})
        ]
    }
];
