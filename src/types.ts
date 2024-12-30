import type { Cookie } from './cookie'
import type { Session } from './session'

export interface SessionData {
  [key: string]: any
  cookie: Cookie
}

export interface SessionStore {
  get(sid: string, callback: (err: any, session?: any) => void): void
  set(sid: string, session: Session, callback: (err?: any) => void): void
  destroy(sid: string, callback: (err?: any) => void): void
  regenerate(req: IncomingRequest, callback: (err?: any) => void): void
  createSession(req: IncomingRequest, sess: any): Session
}

export interface IncomingRequest {
  sessionID: string
  sessionStore: SessionStore
  session?: Session
}
