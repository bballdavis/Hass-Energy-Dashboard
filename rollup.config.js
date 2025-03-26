const typescript = require('@rollup/plugin-typescript');
const nodeResolve = require('@rollup/plugin-node-resolve');
const terser = require('@rollup/plugin-terser');

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/energy-dashboard-card.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    nodeResolve(),
    typescript({
      compilerOptions: {
        declaration: false,
      }
    }),
    terser()
  ],
  external: ['lit']
};
