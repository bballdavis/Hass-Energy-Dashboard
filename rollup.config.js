// filepath: rollup.config.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json'); // loading package.json without import assertions
const typescript = require('rollup-plugin-typescript2');

export default {
  input: "src/register.ts", // updated entry point to src directory
  output: {
    file: pkg.main, // using package.json "main" property
    format: "es",
    sourcemap: true
  },
  plugins: [
    typescript({
      tsconfig: "tsconfig.json",
      // Ensure source maps work correctly
      tsconfigOverride: {
        compilerOptions: {
          sourceMap: true,
          inlineSources: true
        }
      }
    })
  ]
};