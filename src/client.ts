import type { Author, Comment } from './comments.ts'
import { PRIORITIES, STATUSES, TYPES } from './comments.ts'
import { anchorOf, resolve } from './anchor.ts'
import { ICONS } from './icons.ts'
import { STYLE } from './style.ts'

const API = '/__tackle/comments'
const KEY = 'tackle:on'
const OUTLINE_KEY = 'tackle:outlines'
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const clamp = (v: number) => Math.min(1, Math.max(0, v || 0))
const route = () => location.pathname + location.hash

function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000
  return s < 60 ? 'Just now' : s < 3600 ? `${s / 60 | 0}m ago` : s < 86400 ? `${s / 3600 | 0}h ago` : new Date(iso).toLocaleDateString()
}

const NAME: Record<Author, string> = { developer: 'Developer', agent: 'Agent' }
const LABEL: Record<string, string> = { 'in-progress': 'In progress', 'replace-component': 'Replace component' }
const label = (v: string) => LABEL[v] ?? v[0].toUpperCase() + v.slice(1)
const icon = (name: string, cls = '') => `<svg class="i ${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`
const avatar = (a: Author) => `<span class="av ${a}" aria-hidden="true">${NAME[a][0]}</span>`
const OPTIONS: Record<string, readonly string[]> = { status: STATUSES, priority: [...PRIORITIES].reverse(), type: TYPES }
const chip = (f: string, v: string) =>
  `<button type="button" class="chip ${f}-${v}" data-menu="${f}" aria-haspopup="menu" aria-label="${f}: ${label(v)}">${icon(v)}<span>${label(v)}</span>${icon('caret', 'caret')}</button>`
const COPY_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘C' : 'Ctrl+C'
const composer = (ph: string) =>
  `<form>${avatar('developer')}<span class="input"><textarea name="text" rows="1" placeholder="${ph}" aria-label="${ph}"></textarea><button class="send" aria-label="Send">${icon('send')}</button></span></form>`

function init() {
  const host = document.createElement('tackle-overlay')
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>${STYLE}</style><div class="hl"></div><div class="layer" hidden></div>
<div class="panel" role="dialog" aria-label="Comment" hidden></div>
<div class="hint" hidden>Comment mode <kbd>Shift+C to exit</kbd><span class="orphans"></span></div>
<button class="tool" aria-pressed="false" aria-label="Show element outlines" title="Element outlines" hidden>${icon('outline')}</button>`
  document.body.append(host)

  const $ = (s: string) => root.querySelector(s) as HTMLElement
  const hl = $('.hl')
  const layer = $('.layer')
  const panel = $('.panel')
  const hint = $('.hint')
  const orphans = $('.orphans')
  const tool = $('.tool')
  const cursor = Object.assign(document.createElement('style'), { textContent: '*{cursor:crosshair!important}' })
  let on = false
  let comments: Comment[] = []
  let openId: string | null = null
  let hovered: string | null = null
  const anchored = new Map<string, Element>()
  let outlines = false
  try {
    outlines = localStorage.getItem(OUTLINE_KEY) === '1'
  }
  catch {}
  tool.setAttribute('aria-pressed', String(outlines))
  let draft: { el: Element, offset: { x: number, y: number }, priority: string, type: string } | null = null

  const point = (el: Element, o = { x: 1, y: 0 }) => {
    const r = el.getBoundingClientRect()
    return [r.left + o.x * r.width, r.top + o.y * r.height]
  }
  const outline = (el: Element) => {
    if (!outlines)
      return unoutline()
    const r = el.getBoundingClientRect()
    const fresh = !hl.classList.contains('show')
    if (fresh)
      hl.style.transition = 'none'
    Object.assign(hl.style, { transform: `translate(${r.left - 3}px,${r.top - 3}px)`, width: `${r.width + 6}px`, height: `${r.height + 6}px` })
    if (fresh) {
      void hl.offsetWidth
      hl.style.transition = ''
    }
    hl.classList.add('show')
  }
  const unoutline = () => hl.classList.remove('show')

  tool.onclick = () => {
    outlines = !outlines
    tool.setAttribute('aria-pressed', String(outlines))
    try {
      localStorage.setItem(OUTLINE_KEY, outlines ? '1' : '0')
    }
    catch {}
    if (!outlines)
      unoutline()
  }

  async function call(url: string, method = 'GET', body?: unknown): Promise<any> {
    const r = await fetch(url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const data = await r.json().catch(() => null)
    if (!r.ok)
      alert(`Tackle: ${data?.error ?? r.status}`)
    return r.ok && (data ?? true)
  }

  async function copyId(id: string, el: HTMLElement) {
    try {
      await navigator.clipboard.writeText(id)
    }
    catch {
      return prompt('Copy this comment ID', id)
    }
    el.dataset.label ??= el.innerHTML
    el.innerHTML = `${icon('check')}Copied`
    el.classList.add('done')
    setTimeout(() => {
      el.innerHTML = el.dataset.label!
      el.classList.remove('done')
    }, 1200)
  }

  async function load() {
    comments = (await call(API)) || []
    renderPins()
  }

  function renderPins() {
    layer.textContent = orphans.textContent = ''
    anchored.clear()
    comments
      .filter(c => c.context.path === route())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .forEach((c, i) => {
        if (c.status === 'verified')
          return
        const el = resolve(c.anchor)
        const first = c.thread[0]
        const replies = c.thread.length - 1
        const asks = c.status === 'open' && c.thread.at(-1)!.author === 'agent'
        const face = c.status === 'in-progress' ? icon('in-progress', 'spin') : c.status === 'resolved' ? icon('check') : ''
        const pin = document.createElement('div')
        pin.className = `pin ${c.status}${c.id === openId ? ' sel' : ''}`
        pin.dataset.id = c.id
        pin.innerHTML = `<button class="dot" aria-label="Comment #${c.id}, ${label(c.status)}, ${c.priority} ${c.type}${asks ? ', agent replied' : ''}: ${esc(first.text)}">${face}${asks ? '<span class="ask"></span>' : ''}</button><span class="body">
<span class="who"><b>${NAME[first.author]}</b><time>${ago(first.createdAt)}</time></span>
<span class="txt">${esc(first.text)}</span>
<span class="tags"><span class="priority-${c.priority}">${icon(c.priority)}${label(c.priority)}</span><span>${icon(c.type)}${label(c.type)}</span>${replies ? `<span>${icon('chat')}${replies}</span>` : ''}<button class="copy mono" data-copy="${c.id}" title="Copy ID (${COPY_KEY})">#${c.id}${icon('clip')}</button></span></span>`
        pin.onclick = (e) => {
          const copy = (e.target as Element).closest<HTMLElement>('[data-copy]')
          copy ? copyId(c.id, copy) : openThread(c.id)
        }
        if (el) {
          anchored.set(c.id, el)
          const [x, y] = point(el, c.anchor.offset)
          pin.style.left = `${x}px`
          pin.style.top = `${y}px`
          layer.append(pin)
          pin.classList.toggle('flip-x', x + pin.scrollWidth > innerWidth - 8)
          pin.classList.toggle('flip-y', y - pin.scrollHeight < 8)
        }
        else {
          const orphan = document.createElement('button')
          orphan.className = 'orphan'
          orphan.dataset.id = c.id
          orphan.textContent = `#${c.id} not found`
          orphan.onclick = () => openThread(c.id)
          orphans.append(orphan)
        }
      })
    if (draft) {
      const [x, y] = point(draft.el, draft.offset)
      layer.insertAdjacentHTML('beforeend', `<span class="pin draft sel" style="left:${x}px;top:${y}px"><span class="dot"></span></span>`)
      outline(draft.el)
    }
    placePanel()
  }

  function placePanel() {
    const at = root.querySelector(`.sel, .orphan[data-id="${openId}"]`)
    if (panel.hidden || !at)
      return
    const b = at.getBoundingClientRect()
    const r = at.classList.contains('pin') ? { left: b.left, right: b.left + 40, top: b.bottom - 40 } : b
    const w = panel.offsetWidth
    const right = r.right + 12 + w < innerWidth
    panel.style.left = `${Math.max(8, right ? r.right + 12 : r.left - w - 12)}px`
    panel.style.top = `${Math.max(8, Math.min(r.top, innerHeight - panel.offsetHeight - 8))}px`
    panel.style.transformOrigin = right ? 'top left' : 'top right'
  }

  function renderPanel() {
    const c = comments.find(x => x.id === openId)
    if (draft) {
      panel.innerHTML = `<div class="meta">${chip('priority', draft.priority)}${chip('type', draft.type)}</div>${composer('Add a comment')}`
    }
    else if (c) {
      panel.innerHTML = `<header><b>Comment</b><button class="id mono" data-act="copy" title="Copy ID for your agent">${icon('hash')}${c.id}</button><span class="sp"></span>
<button class="ico" data-act="menu" aria-label="More actions" aria-haspopup="menu">${icon('dots')}</button>
<button class="ico" data-act="resolve" aria-label="Resolve" title="Resolve (mark verified)">${icon('resolved')}</button>
<button class="ico" data-act="close" aria-label="Close">${icon('close')}</button></header>
<div class="menu" role="menu" hidden><button role="menuitem" data-act="delete">Delete comment</button></div>
<div class="meta">${chip('status', c.status)}${chip('priority', c.priority)}${chip('type', c.type)}</div>
<div class="msgs">${c.thread.map(m => `<div class="msg">${avatar(m.author)}<span class="who"><b>${NAME[m.author]}</b><time>${ago(m.createdAt)}</time></span><p>${esc(m.text)}</p></div>`).join('')}</div>
${composer('Reply')}`
    }
    else {
      panel.hidden = true
      return
    }
    panel.hidden = false
    const msgs = panel.querySelector('.msgs')
    if (msgs)
      msgs.scrollTop = msgs.scrollHeight
    placePanel()
    panel.querySelector('textarea')!.focus()
  }

  const closePop = () => panel.querySelector('.pop')?.remove()

  function openPop(btn: HTMLElement) {
    closePop()
    const f = btn.dataset.menu!
    const current = draft ? draft[f as 'priority' | 'type'] : comments.find(x => x.id === openId)?.[f as 'status']
    const pop = document.createElement('div')
    pop.className = 'pop'
    pop.setAttribute('role', 'menu')
    pop.innerHTML = OPTIONS[f].map(v => `<button role="menuitemradio" aria-checked="${v === current}" data-pick="${f}" value="${v}" class="${f}-${v}">${icon(v)}<span>${label(v)}</span>${icon('check', 'ok')}</button>`).join('')
    pop.style.left = `${btn.offsetLeft}px`
    pop.style.top = `${btn.offsetTop + btn.offsetHeight + 4}px`
    panel.append(pop)
    pop.querySelector<HTMLElement>('[aria-checked=true]')?.focus()
  }

  function openThread(id: string) {
    draft = null
    unoutline()
    openId = id
    renderPins()
    renderPanel()
  }

  function closePanel() {
    openId = draft = null
    panel.hidden = true
    unoutline()
    renderPins()
  }

  function toggle(next = !on) {
    on = next
    try {
      on ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY)
    }
    catch {}
    layer.hidden = hint.hidden = tool.hidden = !on
    if (on) {
      document.head.append(cursor)
      layer.classList.add('enter')
      load().then(() => setTimeout(() => layer.classList.remove('enter'), 400))
    }
    else {
      cursor.remove()
      closePanel()
    }
  }

  panel.onclick = async (e) => {
    const t = e.target as Element
    const menuBtn = t.closest<HTMLElement>('[data-menu]')
    const pick = t.closest<HTMLButtonElement>('[data-pick]')
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act
    if (!t.closest('.pop'))
      closePop()
    if (menuBtn)
      return openPop(menuBtn)
    if (pick) {
      const f = pick.dataset.pick!
      closePop()
      if (draft) {
        draft[f as 'priority' | 'type'] = pick.value
        panel.querySelector(`[data-menu=${f}]`)!.outerHTML = chip(f, pick.value)
      }
      else if (openId && await call(`${API}/${openId}`, 'PATCH', { [f]: pick.value })) {
        await load()
        panel.querySelector(`[data-menu=${f}]`)!.outerHTML = chip(f, pick.value)
      }
      return
    }
    const url = `${API}/${openId}`
    if (act === 'copy')
      copyId(openId!, t.closest<HTMLElement>('.id')!)
    if (act === 'menu')
      $('.menu').hidden = !$('.menu').hidden
    if (act === 'close')
      closePanel()
    if (act === 'resolve' && await call(url, 'PATCH', { status: 'verified' }))
      closePanel()
    if (act === 'delete' && confirm('Delete this comment?') && await call(url, 'DELETE'))
      closePanel()
    if (act === 'resolve' || act === 'delete')
      load()
  }
  panel.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as Element).tagName === 'TEXTAREA') {
      e.preventDefault()
      panel.querySelector('form')!.requestSubmit()
    }
  }
  panel.onsubmit = async (e) => {
    e.preventDefault()
    const text = panel.querySelector('textarea')!.value.trim()
    if (!text)
      return
    if (draft) {
      const ok = await call(API, 'POST', {
        text,
        priority: draft.priority,
        type: draft.type,
        anchor: { ...anchorOf(draft.el), offset: draft.offset },
        context: {
          url: location.href,
          path: route(),
          viewport: { w: innerWidth, h: innerHeight },
          colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        },
      })
      if (ok) {
        closePanel()
        load()
      }
    }
    else if (await call(`${API}/${openId}/messages`, 'POST', { text })) {
      await load()
      renderPanel()
    }
  }

  host.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape')
      e.stopPropagation()
  })
  addEventListener('keydown', (e) => {
    const t = e.composedPath()[0] as HTMLElement
    const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    if (e.code === 'KeyC' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !typing) {
      e.preventDefault()
      toggle()
    }
    if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey) && hovered && !typing && !getSelection()?.toString()) {
      const chipEl = root.querySelector<HTMLElement>(`.pin[data-id="${hovered}"] [data-copy]`)
      if (chipEl) {
        e.preventDefault()
        copyId(hovered, chipEl)
      }
    }
    if (e.key === 'Escape' && on) {
      if (panel.querySelector('.pop'))
        closePop()
      else
        panel.hidden ? toggle(false) : closePanel()
    }
  })

  const ours = (e: Event) => e.composedPath().includes(host)
  addEventListener('mousemove', (e) => {
    if (!on || draft)
      return
    if (!ours(e)) {
      hovered = null
      return outline(e.target as Element)
    }
    const pin = e.composedPath().find(n => (n as HTMLElement).classList?.contains('pin')) as HTMLElement | undefined
    hovered = pin?.dataset.id ?? null
    const el = hovered && anchored.get(hovered)
    el ? outline(el) : unoutline()
  }, true)
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    addEventListener(type, (e) => {
      if (!on || ours(e))
        return
      e.preventDefault()
      e.stopPropagation()
      if (type !== 'click')
        return
      if (!panel.hidden)
        return closePanel()
      const { clientX, clientY, target } = e as MouseEvent
      const el = target as Element
      const r = el.getBoundingClientRect()
      draft = { el, offset: { x: clamp((clientX - r.left) / r.width), y: clamp((clientY - r.top) / r.height) }, priority: 'low', type: 'style' }
      openId = null
      renderPins()
      renderPanel()
    }, true)
  }

  let queued = false
  const schedule = () => {
    if (queued || !on)
      return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      renderPins()
    })
  }
  addEventListener('scroll', schedule, { capture: true, passive: true })
  addEventListener('resize', schedule)
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true })

  const onRoute = () => {
    if (on) {
      closePanel()
      load()
    }
  }
  for (const fn of ['pushState', 'replaceState'] as const) {
    const orig = history[fn].bind(history) as (...args: unknown[]) => void
    history[fn] = (...args: unknown[]) => {
      orig(...args)
      onRoute()
    }
  }
  addEventListener('popstate', onRoute)

  try {
    if (sessionStorage.getItem(KEY))
      toggle(true)
  }
  catch {}
}

if (!document.querySelector('tackle-overlay'))
  init()
