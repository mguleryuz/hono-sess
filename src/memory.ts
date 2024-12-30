/*!
 * express-session
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

import { Store } from './store'
import type { SessionData } from './types'

const defer =
  typeof setImmediate === 'function'
    ? setImmediate
    : function (fn: Function) {
        process.nextTick(fn.bind.apply(fn, [null, ...Array.from(arguments)]))
      }

interface MemoryStore {
  sessions: { [key: string]: string }
}

/**
 * A session store in memory.
 * @public
 */
class MemoryStore extends Store {
  sessions: { [key: string]: string }

  constructor() {
    super()
    this.sessions = Object.create(null)
  }

  /**
   * Get all active sessions.
   *
   * @param {function} callback
   * @public
   */
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

    callback && defer(callback, null, sessions)
  }

  /**
   * Clear all sessions.
   *
   * @param {function} callback
   * @public
   */
  clear(callback?: (err?: any) => void): void {
    this.sessions = Object.create(null)
    callback && defer(callback)
  }

  /**
   * Destroy the session associated with the given session ID.
   *
   * @param {string} sessionId
   * @public
   */
  override destroy(sessionId: string, callback?: (err?: any) => void): void {
    delete this.sessions[sessionId]
    callback && defer(callback)
  }

  /**
   * Fetch session by the given session ID.
   *
   * @param {string} sessionId
   * @param {function} callback
   * @public
   */
  override get(
    sessionId: string,
    callback: (err: any, session?: SessionData) => void
  ): void {
    defer(callback, null, getSession.call(this, sessionId))
  }

  /**
   * Commit the given session associated with the given sessionId to the store.
   *
   * @param {string} sessionId
   * @param {object} session
   * @param {function} callback
   * @public
   */
  override set(
    sessionId: string,
    session: SessionData,
    callback?: (err?: any) => void
  ): void {
    this.sessions[sessionId] = JSON.stringify(session)
    callback && defer(callback)
  }

  /**
   * Get number of active sessions.
   *
   * @param {function} callback
   * @public
   */
  length(callback: (err: any, length?: number) => void): void {
    this.all((err, sessions) => {
      if (err) return callback(err)
      callback(null, Object.keys(sessions).length)
    })
  }

  /**
   * Touch the given session object associated with the given session ID.
   *
   * @param {string} sessionId
   * @param {object} session
   * @param {function} callback
   * @public
   */
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

    callback && defer(callback)
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

export default MemoryStore
