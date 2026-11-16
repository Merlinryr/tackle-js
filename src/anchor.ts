import type { Anchor } from './comments.ts'

const norm = (s: string | null) => (s ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
function selectorOf(el: Element): string {
  const parts: string[] = []
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    if (e.id) {
      parts.unshift(`#${CSS.escape(e.id)}`)
      return parts.join(' > ')
    }
    const same = [...(e.parentElement?.children ?? [])].filter(s => s.tagName === e!.tagName)
    parts.unshift(e.tagName.toLowerCase() + (same.length > 1 ? `:nth-of-type(${same.indexOf(e) + 1})` : ''))
  }
  return ['body', ...parts].join(' > ')
}

export const anchorOf = (el: Element): Anchor => ({
  tag: el.tagName.toLowerCase(),
  selector: selectorOf(el),
  id: el.id,
  testid: el.getAttribute('data-testid') ?? undefined,
  source: el.closest('[data-source]')?.getAttribute('data-source') ?? undefined,
  text: norm(el.textContent),
})

const q = (s: string) => {
  try {
    return document.querySelector(s)
  }
  catch {
    return null
  }
}

export function resolve(a: Anchor): Element | null {
  const stable = (a.testid && q(`[data-testid="${CSS.escape(a.testid)}"]`)) || (a.id && document.getElementById(a.id))
  if (stable)
    return stable
  const byPath = q(a.selector)
  if (byPath && (!a.text || norm(byPath.textContent) === a.text))
    return byPath
  if (a.text) {
    for (const e of document.querySelectorAll(a.tag)) {
      if (norm(e.textContent) === a.text)
        return e
    }
  }
  return a.testid || a.id ? null : byPath
}
