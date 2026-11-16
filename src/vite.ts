import type { Plugin } from 'vite'
import type { TackleOptions } from './server.ts'
import { tackle } from './server.ts'

/** Dev server only (`apply: 'serve'`): the overlay never reaches a production build. */
export default function tacklePlugin(options: TackleOptions = {}): Plugin {
  return {
    name: 'tackle',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(tackle(options))
    },
    transformIndexHtml: () => [
      { tag: 'script', attrs: { type: 'module', src: '/__tackle/client.js' }, injectTo: 'body' },
    ],
  }
}
