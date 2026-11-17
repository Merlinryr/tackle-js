# @magomerlino/tackle

<p align="center">
  <img src="logo.jpg" alt="tackle logo" width="96">
</p>

<p align="center">
  <img src="banner.jpg" alt="tackle banner" width="100%">
</p>

Figma-style comment bubbles for your running web app. Click any element to pin a comment to it, and the comment is saved as a JSON file in your repo. Your AI agent reads those files and fixes them in priority order.

## Install

```bash
npm i -D @magomerlino/tackle
```

## Setup

**Vite** (any framework):

```ts
// vite.config.ts
import tackle from '@magomerlino/tackle/vite'

export default { plugins: [tackle()] }
```

**Anything else** (Express, Connect, `node:http`): mount the middleware in development and add the script tag.

```js
import { tackle } from '@magomerlino/tackle/server'

app.use(tackle({ dir: '.tackle' }))
```

```html
<script type="module" src="/__tackle/client.js"></script>
```

The overlay is dev-only. It never runs in a production build.

## Use

- **Shift+C** toggles comment mode.
- Click anywhere to add a comment. Click a bubble to open its thread.
- **Enter** sends, **Shift+Enter** adds a line, **Esc** closes.
- Every comment has an id such as `a1b2c3d`. Tell your agent "fix tack a1b2c3d".

Comments are saved as `.tackle/<id>.json`. Commit the folder, but review comments in PRs first: they are text that an AI agent will read.

To keep an element's text out of comments, add `data-tackle-ignore` to it. Inputs, textareas, selects, contenteditable and password fields are never captured.

## Agent loop

```bash
npx --no-install tackle
```

This prints open comments in work order: priority, then type, then age.

To teach your agent the workflow, copy `node_modules/@magomerlino/tackle/skill/tackle/SKILL.md` into your agent's skills folder.

Status flow: `open → in-progress → resolved → verified`.

## Requirements

Node 20 or newer.
