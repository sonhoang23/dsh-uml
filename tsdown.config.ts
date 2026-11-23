import type { UserConfig } from 'tsdown'

const ID = 'dsh-uml'
const EXTERNALS = ['react', 'react/jsx-runtime', '@deepseek-ai/cordis']

const host: UserConfig = {
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  dts: true,
  clean: true,
  outputOptions: { entryFileNames: '[name].js' },
}

const client: UserConfig = {
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  clean: false,
  minify: true,
  sourcemap: false,
  deps: {
    neverBundle: EXTERNALS,
    alwaysBundle: (id: string) => !EXTERNALS.includes(id),
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  outputOptions: {
    codeSplitting: false,
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(ID) + ', factory: (require) => {',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}

export default [host, client]
