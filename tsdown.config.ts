import { defineConfig } from 'tsdown'

export default defineConfig([
  // Node side: middleware, Vite plugin, CLI.
  { entry: ['src/server.ts', 'src/vite.ts', 'src/cli.ts'], platform: 'node', dts: true, fixedExtension: false },
  // Browser overlay: one self-contained, minified file served by the middleware.
  { entry: ['src/client.ts'], platform: 'browser', minify: true, clean: false },
])
