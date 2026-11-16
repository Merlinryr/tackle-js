import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Comment } from './comments.ts'
import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRIORITIES, STATUSES, TYPES } from './comments.ts'
import { gitIdentity } from './identity.ts'

export interface TackleOptions {
  dir?: string
}

export const DEFAULT_DIR = '.tackle'
export const fileOf = (dir: string, id: string) => join(dir, `${id}.json`)

const BASE = '/__tackle'
const MAX_BODY = 64 * 1024
const ID = /^[a-z0-9]{6,32}$/

function normalize(c: any): Comment {
  if (!Array.isArray(c.thread)) {
    c.thread = [{ author: 'developer', text: String(c.text ?? ''), createdAt: c.createdAt }]
    if (c.note)
      c.thread.push({ author: 'agent', text: String(c.note), createdAt: c.createdAt })
    delete c.text
    delete c.note
  }
  return c
}

export async function listComments(dir: string): Promise<Comment[]> {
  let files: string[]
  try {
    files = (await readdir(dir)).filter(f => f.endsWith('.json'))
  }
  catch (e: any) {
    if (e.code === 'ENOENT')
      return []
    throw e
  }
  const out: Comment[] = []
  for (const f of files) {
    try {
      out.push(await readComment(join(dir, f)))
    }
    catch {
      console.warn(`[tackle] skipping unreadable ${f}`)
    }
  }
  return out
}

export function tackle(options: TackleOptions = {}) {
  const dir = resolve(options.dir ?? DEFAULT_DIR)
  const who = gitIdentity(process.cwd())

  const off = process.env.NODE_ENV === 'production'

  return async (req: IncomingMessage, res: ServerResponse, next?: () => void) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname
    if (off || (path !== BASE && !path.startsWith(`${BASE}/`)))
      return next ? next() : send(res, 404, { error: 'not found' })
    try {
      if (path === `${BASE}/client.js` && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-cache' })
        return res.end(await readFile(fileURLToPath(new URL('./client.js', import.meta.url))))
      }
      const m = path.match(/^\/__tackle\/comments(?:\/([^/]*)(\/messages)?)?$/)
      if (!m)
        return send(res, 404, { error: 'not found' })
      const [, id, messages] = m
      if (id !== undefined && !ID.test(id))
        fail(400, 'invalid id')
      const save = (c: Comment, flag = 'w') => writeFile(fileOf(dir, c.id), `${JSON.stringify(c, null, 2)}\n`, { flag })

      if (!id && req.method === 'GET')
        return send(res, 200, await listComments(dir))

      if (!id && req.method === 'POST') {
        const { text, ...rest } = parseNew(await readJson(req))
        const createdAt = new Date().toISOString()
        await mkdir(dir, { recursive: true })
        for (let attempt = 0; ; attempt++) {
          const comment: Comment = {
            id: randomBytes(4).toString('hex').slice(0, 7),
            createdAt,
            ...rest,
            status: 'open',
            thread: [{ author: 'developer', by: await who, text, createdAt }],
          }
          try {
            await save(comment, 'wx')
            return send(res, 201, comment)
          }
          catch (e: any) {
            if (e.code !== 'EEXIST' || attempt >= 4)
              throw e
          }
        }
      }

      if (id && messages && req.method === 'POST') {
        const text = message(await readJson(req))
        const comment = await readExisting(fileOf(dir, id))
        comment.thread.push({ author: 'developer', by: await who, text, createdAt: new Date().toISOString() })
        await save(comment)
        return send(res, 201, comment)
      }

      if (id && !messages && req.method === 'PATCH') {
        const body = await readJson(req)
        const comment = await readExisting(fileOf(dir, id))
        if (body?.status !== undefined)
          comment.status = oneOf(body.status, STATUSES, 'status')
        if (body?.priority !== undefined)
          comment.priority = oneOf(body.priority, PRIORITIES, 'priority')
        if (body?.type !== undefined)
          comment.type = oneOf(body.type, TYPES, 'type')
        await save(comment)
        return send(res, 200, comment)
      }

      if (id && !messages && req.method === 'DELETE') {
        await readExisting(fileOf(dir, id))
        await rm(fileOf(dir, id))
        return send(res, 204)
      }

      fail(405, 'method not allowed')
    }
    catch (e: any) {
      send(res, e.status ?? 500, { error: e.status ? e.message : 'internal error' })
      if (!e.status)
        console.error('[tackle]', e)
    }
  }
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.writeHead(status, body === undefined ? {} : { 'content-type': 'application/json' })
  res.end(body === undefined ? undefined : JSON.stringify(body))
}

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status })
}

// Files on disk can be hand-edited or come from a teammate's commit: check the shape before anything trusts it.
async function readComment(path: string): Promise<Comment> {
  const c = normalize(JSON.parse(await readFile(path, 'utf8')))
  const ok = typeof c?.id === 'string'
    && PRIORITIES.includes(c.priority) && TYPES.includes(c.type) && STATUSES.includes(c.status)
    && Array.isArray(c.thread) && c.thread.length > 0
    && c.thread.every((m: any) => (m?.author === 'developer' || m?.author === 'agent') && typeof m.text === 'string' && m.text.length <= 5000 && (m.by === undefined || typeof m.by === 'string'))
  if (!ok)
    throw new Error(`invalid comment in ${path}`)
  return c
}

async function readExisting(path: string): Promise<Comment> {
  try {
    return await readComment(path)
  }
  catch {
    fail(404, 'comment not found')
  }
}

async function readJson(req: IncomingMessage): Promise<any> {
  if (!req.headers['content-type']?.startsWith('application/json'))
    fail(415, 'content-type must be application/json')
  const parsed = (req as { body?: unknown }).body
  if (parsed !== null && typeof parsed === 'object')
    return parsed
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY)
      fail(413, 'body too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }
  catch {
    fail(400, 'invalid JSON')
  }
}

function str(v: unknown, max: number, name: string): string {
  if (typeof v !== 'string' || v.length > max)
    fail(400, `invalid ${name}`)
  return v
}
const optStr = (v: unknown, max: number, name: string) => v == null || v === '' ? undefined : str(v, max, name)

function oneOf<T extends readonly string[]>(v: unknown, list: T, name: string): T[number] {
  if (!list.includes(v as string))
    fail(400, `invalid ${name}`)
  return v as T[number]
}

function num(v: unknown, name: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v))
    fail(400, `invalid ${name}`)
  return v
}

function message(b: any): string {
  const text = str(b?.text, 5000, 'text').trim()
  if (!text)
    fail(400, 'text is required')
  return text
}

const unit = (v: unknown, name: string) => Math.min(1, Math.max(0, num(v, name)))

function parseAnchor(a: any): Comment['anchor'] {
  a ??= {}
  return {
    tag: str(a.tag, 64, 'anchor.tag'),
    selector: str(a.selector, 2000, 'anchor.selector'),
    id: optStr(a.id, 200, 'anchor.id'),
    testid: optStr(a.testid, 200, 'anchor.testid'),
    source: optStr(a.source, 500, 'anchor.source'),
    text: optStr(a.text, 200, 'anchor.text'),
    offset: a.offset == null ? undefined : { x: unit(a.offset.x, 'offset.x'), y: unit(a.offset.y, 'offset.y') },
  }
}

function parseNew(b: any): Pick<Comment, 'priority' | 'type' | 'anchor' | 'context'> & { text: string } {
  const a = b?.anchor
  const c = b?.context ?? {}
  return {
    text: message(b),
    priority: oneOf(b.priority, PRIORITIES, 'priority'),
    type: oneOf(b.type, TYPES, 'type'),
    anchor: parseAnchor(a),
    context: {
      url: str(c.url, 2000, 'context.url'),
      path: str(c.path, 2000, 'context.path'),
      viewport: { w: num(c.viewport?.w, 'viewport.w'), h: num(c.viewport?.h, 'viewport.h') },
      colorScheme: oneOf(c.colorScheme, ['light', 'dark'] as const, 'colorScheme'),
    },
  }
}
