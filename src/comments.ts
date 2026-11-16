// Shared by the browser overlay, the dev-server middleware and the CLI. No imports: safe everywhere.

// Array order is the agent's work order.
export const PRIORITIES = ['urgent', 'high', 'low'] as const
export const TYPES = ['bug', 'replace-component', 'layout', 'style', 'copy'] as const
export const STATUSES = ['open', 'in-progress', 'resolved', 'verified'] as const
export const AUTHORS = ['developer', 'agent'] as const

export type Priority = (typeof PRIORITIES)[number]
export type Type = (typeof TYPES)[number]
export type Status = (typeof STATUSES)[number]
export type Author = (typeof AUTHORS)[number]

export interface Message {
  author: Author
  text: string
  createdAt: string
}

/** Several independent ways to find the element again; use whichever still matches. */
export interface Anchor {
  tag: string
  selector: string
  id?: string
  testid?: string
  /** `data-source` of the element or its closest ancestor, e.g. `src/Hero.vue:12`. */
  source?: string
  text?: string
  /** Where the bubble was dropped, as a 0–1 fraction of the element's box. */
  offset?: { x: number, y: number }
}

export interface Context {
  url: string
  /** Route the comment belongs to: pathname + hash, e.g. `/docs#install`. */
  path: string
  viewport: { w: number, h: number }
  colorScheme: 'light' | 'dark'
}

export interface Comment {
  id: string
  createdAt: string
  priority: Priority
  type: Type
  status: Status
  /** First message is the comment; the agent replies by appending `author: 'agent'` messages. */
  thread: Message[]
  anchor: Anchor
  context: Context
}

export const sortForAgent = (list: Comment[]): Comment[] => [...list].sort((a, b) =>
  PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
  || TYPES.indexOf(a.type) - TYPES.indexOf(b.type)
  || a.createdAt.localeCompare(b.createdAt))
