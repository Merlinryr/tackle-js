#!/usr/bin/env node
// `tackle [dir]`: prints open comments in the order the agent should handle them.
import { resolve } from 'node:path'
import { sortForAgent } from './comments.ts'
import { DEFAULT_DIR, fileOf, listComments } from './server.ts'

const dir = resolve(process.argv[2] ?? DEFAULT_DIR)
const open = sortForAgent((await listComments(dir)).filter(c => c.status === 'open'))

if (!open.length) {
  console.log('No open tacks.')
}
else {
  for (const [i, c] of open.entries()) {
    const a = c.anchor
    const where = [a.testid && `testid=${a.testid}`, a.id && `id=${a.id}`, a.source && `source=${a.source}`, `selector=${a.selector}`]
    const [first, ...replies] = c.thread
    console.log(`${i + 1}. #${c.id} [${c.priority}] [${c.type}] ${first.text}`)
    for (const m of replies)
      console.log(`   ↳ ${m.author}: ${m.text}`)
    console.log(`   file: ${fileOf(dir, c.id)}  page: ${c.context.path}`)
    console.log(`   anchor: ${where.filter(Boolean).join('  ')}${a.text ? `  text="${a.text}"` : ''}`)
  }
}
