# @magomerlino/tackle

Pin Figma-like comment bubbles on any element of your web app. Comments are saved as JSON files in your repo, and an AI agent works through them in priority order.

- **Framework-agnostic.** One connect-style middleware works with Vite, Express, Connect or plain `node:http`.
- **Repo-native.** Each comment is `.tackle/<id>.json`, so you get diffs, review and history for free. Commit the folder.
- **Robust anchors.** Each comment stores `data-testid`, `id`, `data-source` (file:line), a CSS path and a text snippet. When the DOM drifts, the overlay re-finds the element. If it can't, the comment is listed as "not found" rather than silently dropped.
- **Dev only.** The Vite plugin applies to `serve` only, so the overlay never reaches a production build.
- **Tiny.** The overlay is about 10 KB gzipped (Phosphor icons included), with Shadow DOM isolation and zero runtime dependencies.

## Use it

**Vite** (any framework):

```ts
// vite.config.ts
import tackle from '@magomerlino/tackle/vite'
export default { plugins: [tackle()] }
```

**Anything else.** Mount the middleware in dev and add the script tag yourself:

```js
import { tackle } from '@magomerlino/tackle/server'
app.use(tackle({ dir: '.tackle' }))          // Express / Connect
// http.createServer((req, res) => tackle()(req, res))
```

```html
<script type="module" src="/__tackle/client.js"></script>
```

**Shift+C** toggles comment mode, like Figma:

- Bubbles appear. Hover one to preview it, or click it to open its thread.
- Click anywhere on the page to drop a new comment at that exact spot. The app's own click handlers don't fire while comment mode is on.
- Element outlines are off by default. The button in the bottom-right corner turns them on (remembered per browser): the element under the cursor and the element a bubble is attached to get a glowing outline.
- In a thread you can reply, change the status, priority or type from the dropdowns, resolve (✓, which marks it `verified` and hides it), or delete it from the ••• menu.
- Bubbles show progress: a yellow to-do dot while open, a spinner while in progress, a check once resolved, and a purple badge when the agent replied and is waiting on you.
- Every comment has a short commit-style id (`#a1b2c3d`). Copy it from the hover preview or the thread header (or press Ctrl+C / ⌘C while hovering a bubble), then tell your agent "fix tack a1b2c3d".
- **Enter** sends, **Shift+Enter** adds a new line, and **Esc** closes the thread, then leaves comment mode.

Each comment is a thread between `developer` (you, in the overlay) and `agent` (written to the file by your agent).

## Agent loop

```bash
npx --no-install tackle   # open comments, sorted: urgent → high → low, then bug → replace-component → layout → style → copy
```

Copy [`skill/tackle/SKILL.md`](skill/tackle/SKILL.md) into your agent's skills folder. The agent resolves each anchor to source, makes the change, sets `status: resolved` and replies in the thread. A resolved bubble shows ✓. Open it, then either resolve it (✓ marks it `verified`) or reply and set the status back to `open` so the agent picks it up again.

Status lifecycle: `open → in-progress → resolved → verified`.

## Develop

```bash
pnpm test      # middleware validation + sort (node:test)
pnpm demo      # build, then serve demo/ with the Vite plugin; comments go to demo/.tackle
```

## Security

The endpoint writes text that an agent will later act on, so it is locked down:

- It requires `Content-Type: application/json`, which forces a CORS preflight that is never answered, so other sites can't post to it.
- Server-generated ids are regex-checked before touching the filesystem.
- Enums are validated and only known fields are stored.
- Bodies are capped at 64 KB.
- **Mount it in development only.** As a backstop, it turns itself off when `NODE_ENV=production`.

## Not in this prototype

Screenshots, freeze mode for hover states, comments on elements inside a modal `<dialog>` (the top layer makes the overlay inert), and an MCP server so the agent can reply live (the thread format is ready for it: agent messages are just `author: "agent"`).
