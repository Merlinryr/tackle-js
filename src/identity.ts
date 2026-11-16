import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

// The git identity of the repo's user, as "Name <email>". Used to attribute comments, not to prove who wrote them.
export async function gitIdentity(cwd: string): Promise<string | undefined> {
  try {
    const [name, email] = await Promise.all(['user.name', 'user.email'].map(async k => (await run('git', ['config', k], { cwd })).stdout.trim()))
    return email ? `${name} <${email}>` : undefined
  }
  catch {
    return undefined
  }
}
