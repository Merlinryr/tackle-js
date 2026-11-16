import type { Comment } from '../src/comments.ts'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { sortForAgent } from '../src/comments.ts'
import { tackle } from '../src/server.ts'

let dir: string
let base: string
const server = createServer((req, res) => tackle({ dir })(req, res))

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'tackle-'))
  await new Promise<void>(r => server.listen(0, r))
  base = `http://localhost:${(server.address() as any).port}/__tackle/comments`
})
after(async () => {
  server.close()
  await rm(dir, { recursive: true, force: true })
})

const valid = {
  text: 'Make this bigger',
  priority: 'high',
  type: 'style',
  anchor: { tag: 'h1', selector: 'body > h1', testid: 'title', text: 'Hello', offset: { x: 3, y: 0.25 }, evil: 'dropped' },
  context: { url: 'http://localhost/', path: '/', viewport: { w: 1280, h: 800 }, colorScheme: 'light' },
  status: 'verified',
}
const post = (body: unknown, type = 'application/json') =>
  fetch(base, { method: 'POST', headers: { 'content-type': type }, body: JSON.stringify(body) })

test('create, list, update, delete', async () => {
  const res = await post(valid)
  assert.equal(res.status, 201)
  const c: Comment = await res.json()
  assert.match(c.id, /^[0-9a-f]{7}$/, 'commit-style short id')
  assert.equal(c.status, 'open', 'client cannot set status on create')
  assert.equal((c.anchor as any).evil, undefined, 'unknown fields are dropped')
  const onDisk = JSON.parse(await readFile(join(dir, `${c.id}.json`), 'utf8'))
  assert.deepEqual(onDisk, c)

  assert.deepEqual(await (await fetch(base)).json(), [c])

  assert.deepEqual(c.thread.map(m => [m.author, m.text]), [['developer', 'Make this bigger']])
  assert.deepEqual(c.anchor.offset, { x: 1, y: 0.25 }, 'offset clamped to 0..1')

  const reply = await fetch(`${base}/${c.id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: ' Also bolder ', author: 'agent' }) })
  assert.equal(reply.status, 201)
  assert.deepEqual((await reply.json()).thread.map((m: any) => [m.author, m.text]).at(-1), ['developer', 'Also bolder'], 'browser cannot speak as the agent')

  const patched = await fetch(`${base}/${c.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'resolved', priority: 'urgent', type: 'layout', thread: [] }) })
  assert.equal(patched.status, 200)
  const p: Comment = await patched.json()
  assert.deepEqual([p.status, p.priority, p.type], ['resolved', 'urgent', 'layout'])
  assert.equal(p.thread.length, 2, 'PATCH only touches status, priority and type')

  assert.equal((await fetch(`${base}/${c.id}`, { method: 'DELETE' })).status, 204)
  assert.deepEqual(await readdir(dir), [])
})

test('rejects bad input', async () => {
  assert.equal((await post(valid, 'text/plain')).status, 415, 'non-JSON content type (CSRF guard)')
  assert.equal((await post({ ...valid, priority: 'meh' })).status, 400)
  assert.equal((await post({ ...valid, type: 'vibes' })).status, 400)
  assert.equal((await post({ ...valid, text: '   ' })).status, 400)
  assert.equal((await post({ ...valid, anchor: undefined })).status, 400)
  assert.equal((await post({ text: 'x'.repeat(70_000) })).status, 413)
  assert.equal((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400)
  const patch = (id: string, body: unknown) => fetch(`${base}/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  assert.equal((await patch('..%2F..%2Fpackage', { status: 'open' })).status, 400, 'path traversal')
  assert.equal((await patch('abcdef123', { status: 'open' })).status, 404)
  assert.equal((await fetch(`${base}/..%5Cx`, { method: 'DELETE' })).status, 400)
  assert.equal((await fetch(`${base}/..%2Fx/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"text":"hi"}' })).status, 400)
  assert.equal((await post({ ...valid, anchor: { ...valid.anchor, offset: { x: 'a', y: 0 } } })).status, 400)
  assert.deepEqual(await readdir(dir), [], 'nothing written')
})

test('accepts a body pre-parsed by express.json()', async () => {
  const drained = createServer((req, res) => {
    req.resume()
    req.on('end', () => tackle({ dir })(Object.assign(req, { body: valid }), res))
  })
  await new Promise<void>(r => drained.listen(0, r))
  const url = `http://localhost:${(drained.address() as any).port}/__tackle/comments`
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  drained.close()
  assert.equal(res.status, 201)
  await rm(join(dir, `${(await res.json()).id}.json`))
})

test('upgrades pre-thread comment files on read', async () => {
  await writeFile(join(dir, 'legacy01.json'), JSON.stringify({ id: 'legacy01', createdAt: '2026-01-01', text: 'Old', note: 'Done', status: 'resolved' }))
  const [c] = await (await fetch(base)).json()
  assert.deepEqual(c.thread.map((m: any) => [m.author, m.text]), [['developer', 'Old'], ['agent', 'Done']])
  assert.equal(c.text, undefined)
  await rm(join(dir, 'legacy01.json'))
})

test('skips malformed files instead of failing the list', async () => {
  await writeFile(join(dir, 'broken.json'), '{nope')
  assert.deepEqual(await (await fetch(base)).json(), [])
  await rm(join(dir, 'broken.json'))
})

test('sortForAgent: priority, then type, then age', () => {
  const c = (id: string, priority: string, type: string, createdAt = '2026-01-01') => ({ id, priority, type, createdAt }) as Comment
  const sorted = sortForAgent([
    c('a', 'low', 'bug'),
    c('b', 'urgent', 'copy'),
    c('c', 'high', 'copy'),
    c('d', 'urgent', 'bug', '2026-02-01'),
    c('e', 'urgent', 'bug', '2026-01-15'),
  ])
  assert.deepEqual(sorted.map(x => x.id), ['e', 'd', 'b', 'c', 'a'])
})
