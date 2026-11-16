
export const PRIORITIES = ['urgent', 'high', 'low'] as const
export const TYPES = ['bug', 'replace-component', 'layout', 'style', 'copy'] as const
export const STATUSES = ['open', 'in-progress', 'resolved', 'verified'] as const

export type Priority = (typeof PRIORITIES)[number]
export type Type = (typeof TYPES)[number]
export type Status = (typeof STATUSES)[number]
export type Author = 'developer' | 'agent'

export interface Message {
  author: Author
  text: string
  createdAt: string
}

export interface Anchor {
  tag: string
  selector: string
  id?: string
  testid?: string
  source?: string
  text?: string
  offset?: { x: number, y: number }
}

export interface Context {
  url: string
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
  thread: Message[]
  anchor: Anchor
  context: Context
}

export const sortForAgent = (list: Comment[]): Comment[] => [...list].sort((a, b) =>
  PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)
  || TYPES.indexOf(a.type) - TYPES.indexOf(b.type)
  || a.createdAt.localeCompare(b.createdAt))
