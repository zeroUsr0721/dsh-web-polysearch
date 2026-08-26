/**
 * dsh-web-polysearch build: node-half library + browser client bundle.
 *
 * The client bundle follows the dsh client-module contract: CJS, browser
 * platform, `window.__ModuleLoader__.load({id, factory})` handoff, and module
 * table specifiers (`react`, runtime internals) left external. Everything else
 * inlines into the single lib/client.js artifact.
 */
import { defineConfig } from 'tsdown'

/** Module-table specifiers the shell shares into the frozen module table. */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

/** Client-bundle specifiers whose factories the parser preloads before the shell starts. */
const PRELOADED_CLIENT_EXTERNALS = [
  '@deepseek-ai/dsh-client-runtime/client',
]

const clientExternals = new Set([...PLATFORM_MODULES, ...PRELOADED_CLIENT_EXTERNALS])

export default defineConfig([
  {
    name: 'dsh-web-polysearch',
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: true,
    clean: true,
    deps: {
      // The node half runs inside the host process: every @deepseek-ai/* and
      // framework package is already mounted by the host and must stay an
      // import (bundling a duplicate instance would break service identity).
      neverBundle: (specifier: string) => specifier.startsWith('@deepseek-ai/') || specifier === 'react' || specifier === 'react/jsx-runtime',
    },
  },
  {
    name: 'dsh-web-polysearch/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    clean: false,
    sourcemap: true,
    deps: {
      // Requested module-table rows stay imports (the loader answers them);
      // every other dependency inlines into the bundle.
      neverBundle: (specifier: string) => clientExternals.has(specifier),
      alwaysBundle: (specifier: string) => !clientExternals.has(specifier),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: "dsh-web-polysearch", factory: (require) => {`,
      footer: `return module.exports; } });`,
      intro: `var module = { exports: {} }; var exports = module.exports;`,
    },
  },
])