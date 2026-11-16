---
name: tackle
description: Work through UI comments ("tacks") that a human pinned on elements of the running web app with Tackle. Use when the user says "tackle the tacks", "fix the Tackle comments", "check .tackle", or when a `.tackle/` folder has open comments.
---

# Tackle the tacks

Comments live in `.tackle/<id>.json`, one file per comment, committed with the code. A human created them by clicking elements in the dev overlay.

## 1. Get the work list

```bash
npx --no-install tackle .tackle
```

If the user names a tack id (e.g. "fix tack a1b2c3d"), open `.tackle/a1b2c3d.json` directly and handle only that one.

Otherwise, the command above prints the **open** comments already in work order: priority (`urgent` → `high` → `low`), then type (`bug` → `replace-component` → `layout` → `style` → `copy`), then oldest first. Each line gives the file, the page path and the anchors. If that command fails (@merlinryr/tackle not installed), read the JSON files yourself and apply the same filter and order.

## 2. For each comment, in order

1. **Mark it** `"status": "in-progress"` in its JSON file, and read the whole `thread`. The first message is the request. Later `developer` messages are clarifications or follow-ups, and the latest one wins.
2. **Find the source.** Try the anchors from strongest to weakest and stop at the first hit:
   - `anchor.source`: a `file:line` from a dev plugin. Open it directly.
   - `anchor.testid`: grep `data-testid="<value>"` (also `data-testid={'<value>'}` and similar).
   - `anchor.id`: grep `id="<value>"`.
   - `anchor.text`: grep a distinctive part of the text snippet. It may be split across lines or come from i18n files.
   - `anchor.selector`: a CSS path from `body`. Use it to judge structure (which list item, which section), not to grep.
   - Use `context.path` to narrow the search to the route or page component.
3. **Make the change.** `type` tells you what kind of change:
   - `copy`: text only
   - `style`: visual properties only
   - `layout`: position, spacing or structure
   - `bug`: behaviour
   - `replace-component`: swap the element for a different component

   Keep the change scoped to what the comment asks.
4. **Reply in the thread.** Set `"status": "resolved"` and append one message to `thread` saying what you changed and where:

   ```json
   { "author": "agent", "text": "Renamed the CTA to 'Start free trial' in src/Hero.vue", "createdAt": "<ISO 8601 now>" }
   ```

   Edit only `status` and `thread`, append only, and leave every other field as it is.
5. If the comment is ambiguous or you couldn't find the element, leave it `open`. Append an agent message with your question and move on. The developer answers in the overlay.

## 3. Report

List what you resolved and what you left open, with the reason for each. Never set `verified` yourself: the human does that from the overlay after checking the result.
