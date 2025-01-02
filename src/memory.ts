/*!
 * express-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

import { Session } from './session'
import { Store } from './store'
import type { ExtendedHonoRequest, SessionData } from './types'

/**
 * A session store in memory.
 * @public
 */
export class MemoryStore extends Store {
  sessions: { [key: string]: string }

  constructor() {
    super()
    this.sessions = Object.create(null)
  }

  all(
    callback?: (err: any, sessions: { [key: string]: SessionData }) => void
  ): void {
    const sessionIds = Object.keys(this.sessions)
    const sessions = Object.create(null)

    for (const sessionId of sessionIds) {
      const session = getSession.call(this, sessionId)

      if (session) {
        sessions[sessionId] = session
      }
    }

    callback && callback(null, sessions)
  }

  clear(callback?: (err?: any) => void): void {
    this.sessions = Object.create(null)
    callback && callback()
  }

  destroy(sessionId: string, callback?: (err?: any) => void): void {
    delete this.sessions[sessionId]
    callback && callback()
  }

  get(
    sessionId: string,
    callback: (err: any, session?: SessionData) => void
  ): void {
    callback(null, getSession.call(this, sessionId))
  }

  set(
    sessionId: string,
    session: SessionData,
    callback?: (err?: any) => void
  ): void {
    this.sessions[sessionId] = JSON.stringify(session)
    callback && callback()
  }

  length(callback: (err: any, length?: number) => void): void {
    this.all((err, sessions) => {
      if (err) return callback(err)
      callback(null, Object.keys(sessions).length)
    })
  }

  touch(
    sessionId: string,
    session: SessionData,
    callback?: (err?: any) => void
  ): void {
    const currentSession = getSession.call(this, sessionId)

    if (currentSession) {
      currentSession.cookie = session.cookie
      this.sessions[sessionId] = JSON.stringify(currentSession)
    }

    callback && callback()
  }

  generate(req: ExtendedHonoRequest): void {
    const session = new Session(req, null)
    req.session = session
  }
}

/**
 * Get session from the store.
 * @private
 */
function getSession(
  this: MemoryStore,
  sessionId: string
): SessionData | undefined {
  const sess = this.sessions[sessionId]

  if (!sess) {
    return
  }

  // parse
  const parsed = JSON.parse(sess)

  if (parsed.cookie) {
    const expires =
      typeof parsed.cookie.expires === 'string'
        ? new Date(parsed.cookie.expires)
        : parsed.cookie.expires

    // destroy expired session
    if (expires && expires <= Date.now()) {
      delete this.sessions[sessionId]
      return
    }
  }

  return parsed
}
