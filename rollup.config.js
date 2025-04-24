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
    sourcemap: false  // Set to false to eliminate source map reference
  },
  plugins: [
    typescript({
      tsconfig: "tsconfig.json",
      // Disable source maps
      tsconfigOverride: {
        compilerOptions: {
          sourceMap: false,
          inlineSources: false
        }
      }
    })
  ]
};